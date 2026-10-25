// Offline / OMR Full Mock helpers — used by BOTH the student website (the exam) and the admin
// panel (the printable PDF booklets).
//
// IMPORTANT: this file must stay IDENTICAL in both projects. The five sets are built by a
// seeded (repeatable) shuffle, so the same test always produces exactly the same Set A–E in both
// places. That is what guarantees the paper booklet a student holds matches the questions and
// options shown on the website.
import { normalizeQuestion } from './examEngine';

export const OMR_SUBJECT = 'omr';
export const OMR_SET_LETTERS = ['A', 'B', 'C', 'D', 'E'];
export const OMR_PRE_EXAM_SECONDS = 300; // the unskippable 5-minute pre-exam window
export const DEFAULT_ROLL_DIGITS = 6;

// ---- small seeded random generator (same numbers on every device) ----
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = (seed) => mulberry32(hashSeed(seed)());
function seededShuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Options that only make sense in a fixed position ("All of the above", "Both A and B", "None of
// these"...) are never re-ordered — the question itself still moves, only its options stay put.
const POSITION_DEPENDENT = /\b(all of (the )?(above|these)|none of (the )?(above|these)|all the above|above (two|three|all)|both|neither|either|none|a and b|b and c|a and c|c and d|a and d|b and d|a, b|b, c|cannot be determined|data (is |are )?(inadequate|insufficient))\b|\(\s*[a-d]\s*\)|\b(i|ii|iii|iv)\s*(and|&|,)\s*(i|ii|iii|iv)\b/i;

// A different 5-digit booklet number for each set of a test (the same one every time).
export function bookletNumber(testId, letter) {
  const idx = Math.max(0, OMR_SET_LETTERS.indexOf(letter));
  const used = new Set();
  let result = 10000;
  for (let i = 0; i <= idx; i++) {
    let n = 10000 + (hashSeed(`${testId}|booklet|${OMR_SET_LETTERS[i]}`)() % 90000);
    while (used.has(n)) n = 10000 + ((n - 10000 + 7) % 90000);
    used.add(n);
    result = n;
  }
  return String(result);
}

// Builds one set (A–E) of a test. Set A is the master (questions exactly as uploaded). Sets B–E
// re-order the questions and shuffle each question's options; the correct answer moves with its
// option, so every set is marked correctly.
export function buildOmrSet(test, letter) {
  const L = OMR_SET_LETTERS.includes(letter) ? letter : 'A';
  const tid = String((test && test.id) || 'test');
  const base = ((test && test.questions) || []).map(normalizeQuestion);
  let order = base.map((_, i) => i);
  if (L !== 'A' && base.length > 1) {
    order = seededShuffle(order, rngFor(`${tid}|${L}|order`));
    if (order.every((v, i) => v === i)) order = order.slice(1).concat(order[0]); // never identical to Set A
  }
  const questions = order.map((idx) => {
    const q = base[idx];
    if (L === 'A' || q.options.length < 2) return q;
    if (q.options.some((o) => POSITION_DEPENDENT.test(o.textEn || ''))) return q;
    const perm = seededShuffle(q.options.map((_, i) => i), rngFor(`${tid}|${L}|${q.id ?? idx}`));
    const options = perm.map((orig, pos) => ({ key: String.fromCharCode(65 + pos), textEn: q.options[orig].textEn, textBn: q.options[orig].textBn || '' }));
    const correctPos = perm.findIndex((orig) => q.options[orig].key === q.correct);
    return { ...q, options, correct: correctPos >= 0 ? String.fromCharCode(65 + correctPos) : q.correct };
  });
  return { letter: L, bookletNo: bookletNumber(tid, L), questions };
}

// Roll number = the last N digits of the student's registered phone number (default 6).
export function rollNumberFromPhone(phone, digits = DEFAULT_ROLL_DIGITS) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length > 10) d = d.slice(-10); // drop a +91 / 0 prefix
  const n = Math.min(10, Math.max(4, Number(digits) || DEFAULT_ROLL_DIGITS));
  return d.length ? d.slice(-n) : '';
}

// Random set for a student (uses the browser's secure random generator).
export function pickRandomSetLetter() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return OMR_SET_LETTERS[a[0] % OMR_SET_LETTERS.length];
  } catch (e) {
    return OMR_SET_LETTERS[Math.floor(Math.random() * OMR_SET_LETTERS.length)];
  }
}

// The test object the exam engine actually runs for a student: their assigned set's questions in
// that set's fixed order (no further shuffling), plus the OMR details saved with their result.
export function buildOmrExamTest(test, letter, user) {
  const set = buildOmrSet(test, letter);
  const digits = test.omrRollDigits || DEFAULT_ROLL_DIGITS;
  return {
    ...test,
    questions: set.questions,
    fixedOrder: true,
    omr: { set: set.letter, bookletNo: set.bookletNo, roll: rollNumberFromPhone(user && user.phone, digits), rollDigits: digits },
  };
                       }
