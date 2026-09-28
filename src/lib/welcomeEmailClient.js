// Browser-side trigger for the welcome email. Called from AppContext.jsx's onAuthStateChanged
// handler the moment a Google sign-in is detected — BEFORE the phone-number registration step,
// so it covers everyone who has a Firebase Auth account, including people who never finish
// registering and so never get a student record.
//
// It sends the user's Firebase ID token rather than any student id or email. The server verifies
// the token itself (see api/email/send-welcome/route.js) and takes the recipient address from the
// verified token — so this needs no student record to exist, doesn't race with any Firestore
// write, and can't be used to make the server email someone else.
//
// Everything here is best-effort: any failure is logged and swallowed, and can never affect
// login or registration.
const attemptedThisSession = new Set();

export function triggerWelcomeEmail(firebaseUser) {
  try {
    if (!firebaseUser || !firebaseUser.uid) return;
    // Google sign-ins only, per the original spec. (The server re-checks this from the token.)
    const isGoogle = (firebaseUser.providerData || []).some((p) => p.providerId === 'google.com');
    if (!isGoogle) return;
    // At most one attempt per user per page load, so repeated handler runs can't pile up
    // requests. The server's own sent-flag is what actually guarantees "only once, ever".
    if (attemptedThisSession.has(firebaseUser.uid)) return;
    attemptedThisSession.add(firebaseUser.uid);

    const forgetAttempt = () => attemptedThisSession.delete(firebaseUser.uid);

    firebaseUser.getIdToken()
      // keepalive: lets the request still complete if the page navigates away right after.
      .then((token) => fetch('/api/email/send-welcome', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        keepalive: true,
      }))
      .then((res) => {
        if (res && !res.ok) { console.warn('Welcome email request returned HTTP', res.status); forgetAttempt(); }
      })
      .catch((e) => { console.warn('Welcome email request failed', e); forgetAttempt(); });
  } catch (e) {
    console.warn('Welcome email trigger error', e);
  }
}
