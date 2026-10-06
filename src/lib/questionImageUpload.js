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
//
// HOW PICKED PHOTOS ARE READ (the "phone would not let the browser read that file" problem):
// on Android, the File the picker gives the page is only a short-lived pointer to the photo, and
// it can stop being readable almost immediately — after a pause, after the page re-renders, or
// after a few photos in a row. So the very first thing this function does, before any
// validation, logging or waiting, is start copying the photo's bytes into memory — using three
// different reading methods at the same moment, taking whichever finishes first. Everything
// after that (type detection, decoding, shrinking, saving) works on the in-memory copy only.
// If that instant copy fails, it retries patiently, and as a last resort asks the browser to
// open the picked File directly. The whole upload also has an overall time limit, so it can
// never leave the admin screen stuck in an "uploading" state. Every step is logged to the
// browser console under "[solution-photo]".
import { writeKeyValue, readKeyValue } from './db';
import { uid } from './utils';
import { validateSourcePhoto } from './imageUtils';

const REF_PREFIX = 'fsimg:';
const KEY_PREFIX = 'solimg_';
const MAX_DIMENSION = 1280;          // longest side, in pixels, after shrinking (sharp enough to read on phones)
const MAX_STORED_CHARS = 300000;     // ~225 KB of image; keeps Firestore reads/writes light
const SAVE_TIMEOUT_MS = 20000;
const OVERALL_TIMEOUT_MS = 60000;    // hard stop for the whole upload so the screen can never stay stuck
const log = (...args) => { try { console.info('[solution-photo]', ...args); } catch (e) { /* ignore */ } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isSolutionImageRef = (v) => typeof v === 'string' && v.startsWith(REF_PREFIX);

// ---- 1. Copy the file's bytes into memory, as fast as possible ----
function readWithFileReader(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error('FileReader failed'));
    fr.readAsArrayBuffer(file);
  });
}
const attempt = (fn) => { try { return Promise.resolve(fn()); } catch (e) { return Promise.reject(e); } };
function firstSuccess(promises) {
  return new Promise((resolve, reject) => {
    let failed = 0;
    let lastErr;
    promises.forEach((p) => p.then(resolve, (e) => { lastErr = e; failed += 1; if (failed === promises.length) reject(lastErr); }));
  });
}
const toBytes = (buf) => {
  const bytes = new Uint8Array(buf);
  if (!bytes.length) throw new Error('read returned 0 bytes');
  return bytes;
};
// Starts every reading method at once and resolves with the first one that works.
function startReading(file) {
  return firstSuccess([
    attempt(() => (typeof file.arrayBuffer === 'function' ? file.arrayBuffer() : Promise.reject(new Error('no arrayBuffer')))),
    attempt(() => readWithFileReader(file)),
    attempt(() => (typeof Response === 'function' ? new Response(file).arrayBuffer() : Promise.reject(new Error('no Response')))),
  ]).then(toBytes);
}
// Fallback: patient retries, each time asking the file input for a fresh handle to the file.
const RETRY_DELAYS_MS = [150, 300, 500, 800, 1200]; // 6 more attempts, ~3s in total
async function readBytesWithRetry(file, getFile) {
  let lastErr;
  for (let n = 1; n <= RETRY_DELAYS_MS.length + 1; n++) {
    let f = file;
    if (typeof getFile === 'function') { try { f = getFile() || file; } catch (e) { f = file; } }
    try {
      const bytes = await startReading(f);
      log('file read succeeded on retry', n);
      return bytes;
    } catch (e) {
      lastErr = e;
      log('retry', n, 'failed to read the file:', e && (e.name || e.message));
      if (n <= RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[n - 1]);
    }
  }
  throw lastErr || new Error('Could not read the file');
}

// ---- 2. Work out what the file really is, from its first bytes ----
const ascii = (b, from, to) => String.fromCharCode(...Array.from(b.slice(from, to)));
function sniffMime(b) {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return 'image/png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 6 && ascii(b, 0, 3) === 'GIF') return 'image/gif';
  if (b.length >= 2 && ascii(b, 0, 2) === 'BM') return 'image/bmp';
  if (b.length >= 12 && ascii(b, 4, 8) === 'ftyp') {
    const brand = ascii(b, 8, 12);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand)) return 'image/heic';
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return '';
}

// ---- 3. Decode the image, trying several methods ----
function imageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img load error'));
    img.src = url;
  });
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error('data URL read failed'));
    fr.readAsDataURL(blob);
  });
}
async function decodeImage(blob) {
  const tried = [];
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, method: 'bitmap' };
    } catch (e) { tried.push('bitmap+orientation: ' + (e && e.name)); }
    try {
      const bmp = await createImageBitmap(blob);
      return { source: bmp, width: bmp.width, height: bmp.height, method: 'bitmap-plain' };
    } catch (e) { tried.push('bitmap: ' + (e && e.name)); }
  }
  try {
    const url = URL.createObjectURL(blob);
    try {
      const img = await imageFromUrl(url);
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, method: 'img-objecturl' };
    } finally { URL.revokeObjectURL(url); }
  } catch (e) { tried.push('img+objectURL'); }
  try {
    const img = await imageFromUrl(await blobToDataUrl(blob));
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, method: 'img-dataurl' };
  } catch (e) { tried.push('img+dataURL'); }
  const err = new Error('decode failed');
  err.tried = tried;
  throw err;
}

// Shrinks the photo and returns a JPEG data URL under MAX_STORED_CHARS.
async function compressToDataUrl(decoded) {
  const { source, width: srcW, height: srcH } = decoded;
  if (!srcW || !srcH) throw new Error('That photo has no readable size. Please choose a different photo.');
  let scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH));
  let canvas = null;
  try {
    for (let pass = 0; pass < 6; pass++) {
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));
      canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare the photo. Please try again.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high'; // cleaner text when a large photo is scaled down
      ctx.fillStyle = '#ffffff'; // PNGs with transparency would otherwise turn black as JPEG
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      for (let quality = 0.85; quality >= 0.4; quality -= 0.1) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('Your browser could not compress the photo. Please try a smaller photo.');
        if (dataUrl.length <= MAX_STORED_CHARS) return dataUrl;
      }
      scale *= 0.8; // still too big at the lowest quality — make it smaller and try again
    }
  } finally {
    // Free the picture's memory right away, so several uploads in a row don't pile up on a phone.
    if (canvas) { canvas.width = 0; canvas.height = 0; }
    if (source && typeof source.close === 'function') { try { source.close(); } catch (e) { /* ignore */ } }
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

const READ_FAILED_MSG = 'The phone would not let the browser read that photo. Please pick it again (Gallery or Files works best). If it keeps happening, close other heavy apps or tabs and retry.';

async function runUpload(file, options) {
  // FIRST: start copying the photo into memory, before anything else can disturb the file handle.
  const instantRead = startReading(file);
  instantRead.catch(() => { /* handled below */ });
  log('selected', { name: file.name, type: file.type || '(none)', sizeKB: Math.round(file.size / 1024) });

  // Size/type rule (under 1MB). Some phones report an empty type, so that case is judged by the
  // file's real contents below instead of being rejected here.
  const validationError = validateSourcePhoto({ type: file.type || 'image/jpeg', size: file.size });
  if (validationError) throw new Error(validationError);

  let bytes = null;
  try { bytes = await instantRead; } catch (e) {
    log('instant read failed:', e && (e.name || e.message), '- retrying');
    try { bytes = await readBytesWithRetry(file, options.getFile); } catch (e2) { bytes = null; }
  }

  let decoded;
  if (bytes) {
    const sniffed = sniffMime(bytes);
    const realType = sniffed || (file.type && file.type.startsWith('image/') ? file.type : '');
    log('detected type', { sniffed: sniffed || '(unknown)', bytes: bytes.length });
    if (!realType) throw new Error('That file is not a photo. Please choose a JPG or PNG image.');
    if (realType === 'image/heic' || realType === 'image/heif') {
      throw new Error('This is an iPhone-style HEIC photo, which browsers cannot read. Switch the camera format to JPEG/"Most compatible", or take a screenshot of the photo and upload that.');
    }
    const blob = new Blob([bytes], { type: realType });
    try { decoded = await decodeImage(blob); } catch (e) {
      log('could not decode', { type: realType, sizeKB: Math.round(file.size / 1024), tried: e && e.tried });
      throw new Error(`The photo (${realType}, ${Math.round(file.size / 1024)} KB) could not be opened by this browser. Try taking a screenshot of it and uploading the screenshot, or pick a different photo.`);
    }
  } else {
    // Last resort: the bytes could not be copied, so ask the browser to open the picked File itself.
    log('could not copy the file bytes; trying to open the picked File directly');
    if (!file.type || !file.type.startsWith('image/')) throw new Error(READ_FAILED_MSG);
    try { decoded = await decodeImage(file); } catch (e) { throw new Error(READ_FAILED_MSG); }
  }
  log('decoded using', decoded.method, `${decoded.width}x${decoded.height}`);

  const dataUrl = await compressToDataUrl(decoded);
  const id = uid('si');
  // Firestore writes never finish while the device is offline, so cap the wait.
  await Promise.race([
    writeKeyValue(KEY_PREFIX + id, dataUrl),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Saving the photo timed out. Please check your internet connection and try again.')), SAVE_TIMEOUT_MS)),
  ]);
  cache.set(REF_PREFIX + id, dataUrl);
  log('saved', REF_PREFIX + id, `${Math.round(dataUrl.length / 1024)} KB`);
  return REF_PREFIX + id;
}

// Same name and arguments as before, so QuestionEditor calls it exactly as it always did.
// Returns the reference string to store on the question as `solutionImg`.
export async function uploadQuestionSolutionImage(file, options = {} /* { testId, subject, questionId, getFile } */) {
  if (!file) throw new Error('No file selected.');
  try {
    // NOTE: runUpload() is called straight away (no await before it) so that its first line —
    // starting to read the photo — runs while the browser is still handling the "photo picked" event.
    return await Promise.race([
      runUpload(file, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('The upload took too long and was stopped. Please try again.')), OVERALL_TIMEOUT_MS)),
    ]);
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
