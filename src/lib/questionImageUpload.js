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
// FIX (photo only uploads on the 2nd try): phones hand the browser a reference to the picked
// file (a gallery/cloud/camera item), not the file's bytes, and right after coming back from the
// picker that reference is sometimes not readable yet — but is a moment later, which is exactly
// why picking the same photo again worked. The file's bytes are now copied into memory FIRST,
// after a short pause, using five different reading methods in turn with up to ~6 seconds of
// patient retries (re-fetching the file from the picker each time), and everything after that
// works on the in-memory copy. Decoding also tries several methods, the real file type is
// detected from the file's own first bytes (some phones report none/the wrong one), and every
// step is logged to the browser console under "[solution-photo]" for debugging.
import { writeKeyValue, readKeyValue } from './db';
import { uid } from './utils';
import { validateSourcePhoto } from './imageUtils';

const REF_PREFIX = 'fsimg:';
const KEY_PREFIX = 'solimg_';
const MAX_DIMENSION = 1280;          // longest side, in pixels, after shrinking (sharp enough to read on phones)
const MAX_STORED_CHARS = 300000;     // ~225 KB of image; keeps Firestore reads/writes light
const SAVE_TIMEOUT_MS = 20000;
const log = (...args) => { try { console.info('[solution-photo]', ...args); } catch (e) { /* ignore */ } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const isSolutionImageRef = (v) => typeof v === 'string' && v.startsWith(REF_PREFIX);

// ---- 1. Copy the file's bytes into memory (retrying, because phone file handles can flake) ----
function readWithFileReader(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(new Uint8Array(fr.result));
    fr.onerror = () => reject(fr.error || new Error('FileReader failed'));
    fr.readAsArrayBuffer(file);
  });
}
const READERS = [
  (f) => (typeof f.arrayBuffer === 'function' ? f.arrayBuffer() : readWithFileReader(f)),
  (f) => readWithFileReader(f),
  (f) => (typeof Response === 'function' ? new Response(f).arrayBuffer() : readWithFileReader(f)),
  (f) => (typeof f.slice === 'function' && typeof f.arrayBuffer === 'function' ? f.slice(0, f.size, f.type).arrayBuffer() : readWithFileReader(f)),
  async (f) => {
    const u = URL.createObjectURL(f);
    try { return await (await fetch(u)).arrayBuffer(); } finally { URL.revokeObjectURL(u); }
  },
];
const RETRY_DELAYS_MS = [200, 400, 600, 900, 1200, 1500, 1800]; // 8 attempts, ~6.6s in total
async function readBytes(file, getFile) {
  await sleep(250); // let the browser settle after returning from the phone's photo picker
  let lastErr;
  for (let attempt = 1; attempt <= RETRY_DELAYS_MS.length + 1; attempt++) {
    // From the 2nd attempt on, ask the file input for a fresh handle to the picked file.
    let f = file;
    if (attempt > 1 && typeof getFile === 'function') { try { f = getFile() || file; } catch (e) { f = file; } }
    try {
      const buf = await READERS[(attempt - 1) % READERS.length](f);
      const bytes = new Uint8Array(buf);
      if (bytes.length > 0) {
        if (attempt > 1) log('file read succeeded on attempt', attempt);
        return bytes;
      }
      throw new Error('read returned 0 bytes');
    } catch (e) {
      lastErr = e;
      log('reading the file failed, attempt', attempt, e && (e.name || e.message));
      if (attempt <= RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt - 1]);
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
  let dataUrl = '';
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const w = Math.max(1, Math.round(srcW * scale));
      const h = Math.max(1, Math.round(srcH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare the photo. Please try again.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high'; // cleaner text when a large photo is scaled down
      ctx.fillStyle = '#ffffff'; // PNGs with transparency would otherwise turn black as JPEG
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      for (let quality = 0.85; quality >= 0.4; quality -= 0.1) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (!dataUrl.startsWith('data:image/jpeg')) throw new Error('Your browser could not compress the photo. Please try a smaller photo.');
        if (dataUrl.length <= MAX_STORED_CHARS) return dataUrl;
      }
      scale *= 0.8; // still too big at the lowest quality — make it smaller and try again
    }
  } finally {
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

// Same name and arguments as before, so QuestionEditor calls it exactly as it always did.
// Returns the reference string to store on the question as `solutionImg`.
export async function uploadQuestionSolutionImage(file, options = {} /* { testId, subject, questionId, getFile } */) {
  if (!file) throw new Error('No file selected.');
  log('selected', { name: file.name, type: file.type || '(none)', sizeKB: Math.round(file.size / 1024) });

  // Size/type rule (under 1MB). Some phones report an empty type, so that case is judged by the
  // file's real contents below instead of being rejected here.
  const validationError = validateSourcePhoto({ type: file.type || 'image/jpeg', size: file.size });
  if (validationError) throw new Error(validationError);

  try {
    // Copy the bytes first, before anything else touches the phone's file handle.
    let bytes;
    try { bytes = await readBytes(file, options.getFile); } catch (e) {
      throw new Error('The phone would not let the browser read that file even after several tries. Pick the photo again (try choosing it from Gallery or Files rather than straight from the camera), then retry.');
    }
    const sniffed = sniffMime(bytes);
    const realType = sniffed || (file.type && file.type.startsWith('image/') ? file.type : '');
    log('detected type', { sniffed: sniffed || '(unknown)', bytes: bytes.length });
    if (!realType) throw new Error('That file is not a photo. Please choose a JPG or PNG image.');
    if (realType === 'image/heic' || realType === 'image/heif') {
      throw new Error('This is an iPhone-style HEIC photo, which browsers cannot read. Switch the camera format to JPEG/"Most compatible", or take a screenshot of the photo and upload that.');
    }

    const blob = new Blob([bytes], { type: realType });
    let decoded;
    try { decoded = await decodeImage(blob); } catch (e) {
      log('could not decode', { type: realType, sizeKB: Math.round(file.size / 1024), tried: e && e.tried });
      throw new Error(`The photo (${realType}, ${Math.round(file.size / 1024)} KB) could not be opened by this browser. Try taking a screenshot of it and uploading the screenshot, or pick a different photo.`);
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
