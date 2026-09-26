// POST /api/razorpay/create-order
// Body: { batchId, studentId }
// Returns: { orderId, amount, currency, keyId } for the client to open Razorpay Checkout with.
//
// The batch's price is looked up HERE, server-side, from Firestore — never trusted from the
// client. Without this, a tampered client could send its own "amount" and pay 1 for a 300
// rupee batch.
import { NextResponse } from 'next/server';
import { readAdminKeyValue } from '../../../../lib/firebaseAdmin';
import { createRazorpayOrder } from '../../../../lib/razorpayServer';

export async function POST(request) {
  try {
    const { batchId, studentId } = await request.json();
    if (!batchId || !studentId) {
      return NextResponse.json({ error: 'batchId and studentId are required.' }, { status: 400 });
    }

    const batches = await readAdminKeyValue('batches', []);
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });
    if (batch.active === false) return NextResponse.json({ error: 'This batch is not currently open for enrollment.' }, { status: 400 });

    const order = await createRazorpayOrder({
      amountRupees: batch.price,
      // Razorpay caps receipt at 40 characters.
      receipt: `enr_${studentId}_${Date.now()}`.slice(0, 40),
      notes: { batchId, batchName: batch.name, studentId },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      batchName: batch.name,
    });
  } catch (err) {
    console.error('create-order failed:', err);
    return NextResponse.json({ error: 'Could not start payment. Please try again in a moment.' }, { status: 500 });
  }
}
