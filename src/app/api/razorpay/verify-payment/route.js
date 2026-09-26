// POST /api/razorpay/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentId, batchId }
//
// This is the ONLY place enrollment actually gets granted for an online payment. It never
// trusts the client's word that payment succeeded — it independently recomputes the Razorpay
// signature server-side (see lib/razorpayServer.js) and only writes to Firestore if that check
// passes. A tampered client calling this route directly with made-up IDs will simply fail
// signature verification and get a 400, never an enrollment.
//
// IMPORTANT: this deliberately writes the exact same two fields the existing manual admin
// approval flow does — `paymentStatus: 'Approved'` and `batch: <batch name>` (see
// components/admin/StudentsManager.jsx's grantAccess) — so a Razorpay-enrolled student is
// completely indistinguishable, everywhere else in the app (dashboard, mock test unlocking,
// admin panel), from one an admin approved manually. Nothing about the manual flow itself
// (EnrollModal's UTR submission, StudentsManager's pending-approval review) was touched by this
// route or by anything else in this integration.
import { NextResponse } from 'next/server';
import { readAdminKeyValue, writeAdminKeyValue } from '../../../../lib/firebaseAdmin';
import { verifyRazorpaySignature } from '../../../../lib/razorpayServer';

export async function POST(request) {
  try {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      studentId,
      batchId,
    } = await request.json();

    if (!orderId || !paymentId || !signature || !studentId || !batchId) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const isGenuine = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!isGenuine) {
      console.warn('Razorpay signature verification FAILED for payment', paymentId, '— refusing to enroll.');
      return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
    }

    const [students, batches] = await Promise.all([
      readAdminKeyValue('students', []),
      readAdminKeyValue('batches', []),
    ]);

    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return NextResponse.json({ error: 'Batch not found.' }, { status: 404 });

    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    // Idempotency guard: if this exact payment was already processed (e.g. the client retried
    // this request after a network hiccup on the response), don't re-write or double-charge
    // any downstream logic — just confirm success again.
    if (students[idx].lastRazorpayPaymentId === paymentId) {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const updated = {
      ...students[idx],
      paymentStatus: 'Approved',
      batch: batch.name,
      // Additive fields only — nothing the manual flow or admin panel reads was renamed or
      // removed. These exist purely for payment traceability/support lookups.
      lastRazorpayPaymentId: paymentId,
      lastRazorpayOrderId: orderId,
      paymentMethod: 'razorpay',
      paidAmount: batch.price,
      paidAt: new Date().toISOString(),
    };
    const nextStudents = [...students];
    nextStudents[idx] = updated;
    await writeAdminKeyValue('students', nextStudents);

    return NextResponse.json({ ok: true, batchName: batch.name });
  } catch (err) {
    console.error('verify-payment failed:', err);
    return NextResponse.json({ error: 'Something went wrong verifying your payment. Please contact support with your payment ID.' }, { status: 500 });
  }
}
