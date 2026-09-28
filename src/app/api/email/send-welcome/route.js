// POST /api/email/send-welcome
// Header: Authorization: Bearer <the signed-in Google user's Firebase ID token>
//
// WHAT CHANGED vs the earlier version of this route (which took a { studentId } body):
//  - The caller is identified by a verified Firebase ID token, not a client-supplied student id.
//    The recipient address comes from the VERIFIED token, so this needs no student record to
//    exist yet (covers people who sign in but never finish the phone-number step), can't race
//    with any client-side Firestore write, and can't be used to email someone else.
//  - "Already sent" is tracked in its own small per-user document, tce_email_state/{uid}, instead
//    of a flag on the shared `students` array. The old approach read the whole array, waited
//    seconds for Resend, then wrote the whole array back — which could overwrite any other
//    change made to `students` in that window. This route never writes to `students` at all.
//  - welcomeEmailSent is set to true ONLY AFTER Resend confirms the send. A failed attempt
//    leaves it unset, so it is retried the next time that user signs in.
//  - A short-lived "claim" stops two simultaneous calls from both sending (e.g. the browser
//    calling twice in quick succession). It expires after 2 minutes, so a crashed attempt can
//    never block a retry forever.
//  - Every failure is logged with the recipient and error message. Search Vercel Logs for
//    "[welcome-email]".
//
// The send is awaited BEFORE the response is returned, so Vercel keeps the function alive until
// it finishes. (Next 14 has no stable after()/waitUntil, and awaiting is the reliable option.)
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDB, readAdminKeyValue } from '../../../../lib/firebaseAdmin';
import { verifyFirebaseIdToken } from '../../../../lib/firebaseAdminAuth';
import { sendEmail } from '../../../../lib/resend';
import { welcomeEmail } from '../../../../lib/emailTemplates';

const STATE_COLLECTION = 'tce_email_state';
const CLAIM_TTL_MS = 2 * 60 * 1000;

export async function POST(request) {
  let uid = 'unknown';
  let recipient = 'unknown';
  try {
    const header = request.headers.get('authorization') || '';
    const idToken = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!idToken) return NextResponse.json({ error: 'Missing sign-in token.' }, { status: 401 });

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (e) {
      console.error('[welcome-email] token verification failed:', e.message);
      return NextResponse.json({ error: 'Invalid sign-in token.' }, { status: 401 });
    }

    uid = decoded.uid;
    recipient = decoded.email || 'no-email-on-account';

    // Google sign-ins only, per the spec.
    if (decoded.firebase?.sign_in_provider !== 'google.com') {
      return NextResponse.json({ ok: true, skipped: 'not-a-google-signin' });
    }
    if (!decoded.email) {
      console.error('[welcome-email] FAILED: this Google account has no email address', { uid });
      return NextResponse.json({ error: 'No email on this account.' }, { status: 400 });
    }

    const stateRef = adminDB.collection(STATE_COLLECTION).doc(uid);

    // Cheap fast path: nearly every repeat call ends here after a single read.
    const existingState = await stateRef.get();
    if (existingState.exists && existingState.data().welcomeEmailSent) {
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    // Backward compatibility: the previous version of this feature recorded the flag on the
    // student's own record. Honour it (read-only — nothing is written to `students`), so anyone
    // who already got a welcome email under the old scheme doesn't get a second one.
    const students = await readAdminKeyValue('students', []);
    const legacy = students.find((s) => s.uid === uid || (s.email || '').toLowerCase() === recipient.toLowerCase());
    if (legacy && legacy.welcomeEmailSent) {
      await stateRef.set({ welcomeEmailSent: true, email: recipient, carriedOverFromStudentRecord: true }, { merge: true });
      return NextResponse.json({ ok: true, alreadySent: true });
    }

    // Atomically claim the right to send, so simultaneous calls can't both send.
    const claim = await adminDB.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      const data = snap.exists ? snap.data() : {};
      if (data.welcomeEmailSent) return 'already-sent';
      const claimedAt = data.welcomeEmailClaimedAt ? Date.parse(data.welcomeEmailClaimedAt) : 0;
      if (claimedAt && Date.now() - claimedAt < CLAIM_TTL_MS) return 'in-progress';
      tx.set(stateRef, { email: recipient, welcomeEmailClaimedAt: new Date().toISOString() }, { merge: true });
      return 'claimed';
    });
    if (claim !== 'claimed') return NextResponse.json({ ok: true, skipped: claim });

    // Send. Awaited, and inside the try/catch, so a failure can never escape as an unhandled
    // error — and it never blocks login or registration, since the browser doesn't wait on this.
    let result;
    try {
      const { subject, html } = welcomeEmail({ name: decoded.name || 'there' });
      result = await sendEmail({ to: recipient, subject, html });
    } catch (sendErr) {
      console.error('[welcome-email] FAILED to send', { recipient, uid, error: sendErr.message });
      // Release the claim and leave welcomeEmailSent UNSET so the next login retries.
      try {
        await stateRef.set({
          welcomeEmailClaimedAt: FieldValue.delete(),
          lastWelcomeEmailError: String(sendErr.message).slice(0, 500),
          lastWelcomeEmailAttemptAt: new Date().toISOString(),
        }, { merge: true });
      } catch (releaseErr) {
        console.error('[welcome-email] could not release claim after failed send', { recipient, uid, error: releaseErr.message });
      }
      return NextResponse.json({ error: 'Could not send welcome email.' }, { status: 500 });
    }

    // Resend confirmed the send — ONLY NOW is the flag set.
    try {
      await stateRef.set({
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date().toISOString(),
        resendEmailId: (result && result.id) || null,
        welcomeEmailClaimedAt: FieldValue.delete(),
        lastWelcomeEmailError: FieldValue.delete(),
      }, { merge: true });
    } catch (flagErr) {
      // The email DID go out but recording it failed; the user may get one duplicate on a later
      // login. Logged so it's visible. (Deliberate trade-off of "only mark sent after success".)
      console.error('[welcome-email] SENT but could not record it', { recipient, uid, error: flagErr.message });
    }

    console.log('[welcome-email] sent', { recipient, uid, resendEmailId: result && result.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[welcome-email] unexpected error', { recipient, uid, error: err.message });
    return NextResponse.json({ error: 'Could not send welcome email.' }, { status: 500 });
  }
}
