// Server-only Razorpay helpers. Only ever imported from src/app/api/ routes. Uses plain fetch()
// against Razorpay's REST API rather than adding their Node SDK as a dependency — keeps this to
// zero new packages beyond firebase-admin, and the REST surface used here is tiny (one POST to
// create an order).
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Creates a Razorpay Order — the object Checkout needs to know what it's collecting payment
// for. `amountRupees` must always come from a server-side price lookup (see create-order route),
// NEVER from a value the client sent — otherwise a tampered client could request an order for
// any amount it likes.
export async function createRazorpayOrder({ amountRupees, receipt, notes }) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay server credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100), // Razorpay expects the smallest currency unit (paise for INR)
      currency: 'INR',
      receipt,
      notes,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description || 'Razorpay order creation failed');
  return data; // { id, amount, currency, ... }
}

// Confirms a completed payment is genuine and wasn't forged/tampered with by the client.
// Razorpay's documented scheme: HMAC-SHA256 of "order_id|payment_id" using the Key Secret must
// equal the signature Checkout returned. This is the ONLY trustworthy way to confirm a payment
// succeeded — a client-side "payment succeeded!" message alone proves nothing, since a browser
// can call your enrollment endpoint directly without ever actually paying.
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!RAZORPAY_KEY_SECRET) throw new Error('RAZORPAY_KEY_SECRET is missing.');
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  // Timing-safe comparison so this check itself can't leak signature bytes via response-time
  // differences.
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature || '');
  if (expectedBuf.length !== givenBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, givenBuf);
}
