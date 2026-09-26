// Server-only Firebase Admin initializer. NEVER import this from any file that also runs in
// the browser (any component, any 'use client' file) — it uses a service account with full,
// unrestricted access to Firestore, bypassing security rules entirely. That's exactly why it
// exists: this is the trusted authority that writes enrollment data ONLY after independently
// verifying a real Razorpay payment happened server-side (see api/razorpay/verify-payment) —
// it must never be reachable from client code, or that trust boundary is meaningless.
//
// Only ever import this from files under src/app/api/ (Next.js API routes, which always run
// server-side) or other server-only modules.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Vercel's env var UI stores literal "\n" sequences rather than real newlines; the private
  // key needs real newlines to parse as valid PEM.
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials are missing. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY.');
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export const adminDB = getFirestore(getAdminApp());

const FS_COLLECTION = 'tce_app_data'; // must match SUBMISSIONS_COLLECTION/FS_COLLECTION in lib/db.js exactly

// Admin-SDK equivalent of lib/db.js's client-side readKeyValue — same chunk-reassembly scheme,
// rewritten against the Admin SDK's API shape (DocumentSnapshot.exists is a boolean here, not a
// method, and collection/doc are called as methods rather than imported functions). Used by API
// routes that need to authoritatively read app data (e.g. looking up a batch's real price)
// without depending on the client SDK or being subject to Firestore security rules.
export async function readAdminKeyValue(key, fallback) {
  const ref = adminDB.collection(FS_COLLECTION).doc(key);
  const snap = await ref.get();
  if (!snap.exists) return fallback;
  const d = snap.data();
  if (!d.chunked) return ('value' in d) ? d.value : fallback;
  const count = d.chunkCount || 0;
  if (count === 0) return fallback;
  const chunkSnaps = await Promise.all(
    Array.from({ length: count }, (_, i) => ref.collection('chunks').doc('c' + i).get())
  );
  const json = chunkSnaps.map((s) => (s.exists ? (s.data().data || '') : '')).join('');
  try { return JSON.parse(json); } catch (e) { console.error('Failed to reassemble chunked data for ' + key, e); return fallback; }
}

// --- The three helpers below are intentionally duplicated from lib/db.js rather than imported
// from it: db.js is a 'use client' module built around the client Firestore SDK, and this file
// must stay strictly server-only (it holds full-access Admin SDK credentials). Keeping these
// tiny, dependency-free pure functions duplicated here avoids ever pulling client-bundle code
// into a server-only file. If FS_MAX_DOC_BYTES or the chunking scheme ever changes, both copies
// need updating together — they must stay byte-for-byte compatible, since the client SDK reads
// whatever this writes and vice versa.
const FS_MAX_DOC_BYTES = 900000; // must match lib/db.js exactly
function sanitizeForFirestoreAdmin(value) { return JSON.parse(JSON.stringify(value)); }
function utf8ByteLengthAdmin(str) { return Buffer.byteLength(str, 'utf8'); }
function splitStringByBytesAdmin(str, maxBytes) {
  const parts = [];
  let current = '';
  let currentBytes = 0;
  for (const ch of str) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    if (currentBytes + chBytes > maxBytes) { parts.push(current); current = ''; currentBytes = 0; }
    current += ch; currentBytes += chBytes;
  }
  if (current) parts.push(current);
  return parts;
}

// Admin-SDK equivalent of lib/db.js's client-side writeKeyValue — same chunking scheme, so
// anything written here reads back correctly through the normal client-side loadDB()/realtime
// listeners, and vice versa. Used by API routes that write trusted, server-verified data (e.g.
// enrollment after a verified Razorpay payment) directly, bypassing Firestore security rules —
// which is correct here, since these routes ARE the trust boundary.
export async function writeAdminKeyValue(key, value) {
  const ref = adminDB.collection(FS_COLLECTION).doc(key);
  const chunksRef = ref.collection('chunks');
  const clean = sanitizeForFirestoreAdmin(value);
  const json = JSON.stringify(clean);
  const rev = Date.now();

  let previousChunkCount = 0;
  const prevSnap = await ref.get();
  if (prevSnap.exists) previousChunkCount = prevSnap.data().chunkCount || 0;

  if (utf8ByteLengthAdmin(json) <= FS_MAX_DOC_BYTES) {
    await ref.set({ chunked: false, value: clean, chunkCount: 0, rev });
    if (previousChunkCount > 0) {
      const cleanup = adminDB.batch();
      for (let i = 0; i < previousChunkCount; i++) cleanup.delete(chunksRef.doc('c' + i));
      await cleanup.commit().catch(() => {});
    }
    return;
  }

  const parts = splitStringByBytesAdmin(json, FS_MAX_DOC_BYTES);
  const batch = adminDB.batch();
  batch.set(ref, { chunked: true, value: null, chunkCount: parts.length, rev });
  parts.forEach((part, i) => batch.set(chunksRef.doc('c' + i), { data: part }));
  for (let i = parts.length; i < previousChunkCount; i++) batch.delete(chunksRef.doc('c' + i));
  await batch.commit();
}
