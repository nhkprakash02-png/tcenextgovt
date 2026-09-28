// Server-only. Verifies a Firebase ID token sent from the browser, returning the token's
// trusted claims (uid, email, name, and which sign-in provider was used). This is what lets an
// API route know WHO is calling without trusting anything the client says about itself.
//
// Kept as its own small file, rather than adding to firebaseAdmin.js, so that shared file (used
// by the Razorpay flow) stays completely untouched.
import './firebaseAdmin'; // side effect only: guarantees the Admin app is initialized before getAuth() below
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export async function verifyFirebaseIdToken(idToken) {
  return getAuth(getApps()[0]).verifyIdToken(idToken);
}
