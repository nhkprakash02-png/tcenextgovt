// POST /api/email/test-send
// Body: { type: 'welcome' | 'payment' | 'enrollment', to: 'your.email@example.com', secret: '...' }
//
// A safe way to test any of the three email templates WITHOUT a real Google login, a real
// Razorpay payment, or asking an admin to grant access. This route never reads or writes any
// student data at all — it renders the chosen template with realistic SAMPLE data and sends it
// straight to whatever address you put in "to". Nothing in Firestore is touched.
//
// Protected by a shared secret (see .env.example: EMAIL_TEST_SECRET) so this can't be used by a
// stranger to spam arbitrary inboxes using your Resend account/quota.
import { NextResponse } from 'next/server';
import { sendEmail } from '../../../../lib/resend';
import { welcomeEmail, paymentConfirmationEmail, enrollmentConfirmationEmail } from '../../../../lib/emailTemplates';

export async function POST(request) {
  try {
    const { type, to, secret } = await request.json();

    if (!process.env.EMAIL_TEST_SECRET || secret !== process.env.EMAIL_TEST_SECRET) {
      return NextResponse.json({ error: 'Invalid or missing secret.' }, { status: 401 });
    }
    if (!to) return NextResponse.json({ error: '"to" (an email address) is required.' }, { status: 400 });

    let subject, html;
    if (type === 'welcome') {
      ({ subject, html } = welcomeEmail({ name: 'Priya' }));
    } else if (type === 'payment') {
      ({ subject, html } = paymentConfirmationEmail({
        name: 'Priya', batchName: 'WBP Constable — Full Batch', amount: '299',
        paymentId: 'pay_TEST123456789', orderId: 'order_TEST987654321',
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      }));
    } else if (type === 'enrollment') {
      ({ subject, html } = enrollmentConfirmationEmail({ name: 'Priya', batchName: 'SSC GD Constable — Full Batch' }));
    } else {
      return NextResponse.json({ error: 'type must be "welcome", "payment" or "enrollment".' }, { status: 400 });
    }

    await sendEmail({ to, subject, html });
    return NextResponse.json({ ok: true, sentTo: to, type });
  } catch (err) {
    console.error('test-send failed:', err);
    return NextResponse.json({ error: err.message || 'Test send failed.' }, { status: 500 });
  }
}
