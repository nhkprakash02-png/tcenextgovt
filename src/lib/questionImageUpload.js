'use client';

// Solution photos WITHOUT Firebase Storage (Storage needs the paid Blaze plan; this works on the
// free Spark plan, using only Firestore).
//
// How it works:
//  1. The admin's photo is validated (image, under 1MB — same rule as profile photos, via
//     validateSourcePhoto), then shrunk in the browser (max 1280px wide/tall, JPEG, keeping its
//     own aspect ratio) until it is small — normally 60-220 KB.
//  2. The resulting Base64 text is saved as its OWN small Firestore document,
//     tce_app_data/solimg_<id> (same collection and same read/write helpers the rest of the app
//     already uses, so no new Firestore rules are needed).
//  3. The question only stores a short reference, "fsimg:<id>", in `solutionImg`.
//
// WHY a separate document and not the Base64 inside the question itself: every exam submission
// copies each question into the student's result document, and Firestore rejects any single
// document over 1MB — so Base64 inside questions would make big tests impossible to submit.
// It would also make every visitor download every photo on every page load. With a reference,
// the photo is fetched only when a student opens "View Solution" (see SolutionImage.jsx).
import { writeKeyValue, readKeyValue } from './db';
import { uid } from './utils';
import { validateSourcePhoto } from './imageUtils';

const REF_PREFIX = 'fsimg:';
const KEY_PREFIX = 'solimg_';
const MAX_DIMENSION = 1280;          // longest side, in pixels, after shrinking (sharp enough to read on phones)
const MAX_STORED_CHARS = 300000;     // ~225 KB of image; keeps Firestore reads/writes light
const SAVE_TIMEOUT_MS = 20000;

export const isSolutionImageRef = (v) => typeof v === 'string' && v.startsWith(REF_PREFIX);

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as an image. Please choose a JPG or PNG photo.')); };
    img.src = url;
  });
}

// Shrinks the photo and returns a JPEG data URL under MAX_STORED_CHARS.
async function compressToDataUrl(file) {
  const img = await loadImageElement(file);
  let scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  let dataUrl = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high'; // cleaner text when a large photo is scaled down
    ctx.fillStyle = '#ffffff'; // PNGs with transparency would otherwise turn black as JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (let quality = 0.85; quality >= 0.4; quality -= 0.1) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= MAX_STORED_CHARS) return dataUrl;
    }
    scale *= 0.8; // still too big at the lowest quality — make it smaller and try again
  }
  throw new Error('This photo is too detailed to store. Please choose a simpler or smaller photo.');
}

function explainError(err) {
  const code = (err && err.code) || '';
  if (code === 'permission-denied') {
    return 'Firestore refused to save the photo (permission denied). Check your Firestore Rules allow writing to the "tce_app_data" collection.';
  }
  return (err && err.message) || 'Upload failed. Please try again.';
}

// Same name and arguments as before, so QuestionEditor calls it exactly as it always did.
// Returns the reference string to store on the question as `solutionImg`.
export async function uploadQuestionSolutionImage(file /*, { testId, subject, questionId } */) {
  const validationError = validateSourcePhoto(file);
  if (validationError) throw new Error(validationError);
  try {
    const dataUrl = await compressToDataUrl(file);
    const id = uid('si');
    // Firestore writes never finish while the device is offline, so cap the wait.
    await Promise.race([
      writeKeyValue(KEY_PREFIX + id, dataUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Saving the photo timed out. Please check your internet connection and try again.')), SAVE_TIMEOUT_MS)),
    ]);
    cache.set(REF_PREFIX + id, dataUrl);
    return REF_PREFIX + id;
  } catch (err) {
    throw new Error(explainError(err));
  }
}

// Turns whatever is stored in `solutionImg` into something an <img> can show. Old-style values
// (a normal http link or a data: string) are returned unchanged; "fsimg:<id>" references are
// fetched from Firestore once and then remembered for the session.
const cache = new Map();
export async function loadSolutionImage(value) {
  if (!isSolutionImageRef(value)) return value || '';
  if (cache.has(value)) return cache.get(value);
  const dataUrl = await readKeyValue(KEY_PREFIX + value.slice(REF_PREFIX.length), '');
  if (!dataUrl) throw new Error('Solution photo not found.');
  cache.set(value, dataUrl);
  return dataUrl;
      }
