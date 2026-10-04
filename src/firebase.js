'use client';

// Firebase config — ported 1:1 from the original index.html. The ONLY thing the Next.js
// migration changed here is the env-var prefix: Vite's `import.meta.env.VITE_*` became Next's
// `process.env.NEXT_PUBLIC_*`, which is the exact equivalent browser-exposed mechanism. Every
// key, fallback value, and the DEMO_MODE flag are unchanged.
// Move this to environment variables (see .env.example) before committing to a public repo;
// client Firebase config values aren't secret by design, but keeping them out of source
// control is still good hygiene, especially since this project's Firestore rules should be
// the real access boundary (see README "Security notes").
//
// NOTE on Storage: student profile photos still deliberately avoid Storage, staying as
// compressed Base64 strings directly in Firestore instead (see src/lib/imageUtils.js) — that
// choice is unchanged. Storage IS now initialized below, used for exactly one thing: admin-
// uploaded question solution images (see lib/questionImageUpload.js), which are too numerous
// and too large to reasonably store as Base64 inside question documents. Firebase's free Spark
// plan includes 5GB of Storage and 1GB/day of download bandwidth, and the 1MB per-image cap
// enforced at upload time keeps this comfortably inside that free tier even with hundreds of
// solution images.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAelAmzeV33Ejc6i-aDKJg_GDgqJdswcI4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'tce-nahata.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tce-nahata',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tce-nahata.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || '718216468668',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:718216468668:web:517364ed83fdff2fd918b9',
};

export const DEMO_MODE = false;

let fbApp = null, fbAuth = null, fbDB = null, fbStorage = null;
try {
  fbApp = initializeApp(firebaseConfig);
  fbAuth = getAuth(fbApp);
  fbDB = getFirestore(fbApp);
  fbStorage = getStorage(fbApp);
} catch (e) {
  console.warn('Firebase init failed, using demo mode', e);
}

export { fbApp, fbAuth, fbDB, fbStorage };
export const googleProvider = new GoogleAuthProvider();
