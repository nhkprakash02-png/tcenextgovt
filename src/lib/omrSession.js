'use client';

// Student-site helpers for the Offline / OMR pre-exam window. The window's start time lives in
// localStorage, so its 5 minutes keep counting even when the student leaves the page, switches
// app, or the app is cleared from memory.
//   Record (per student + test): { setLetter, startedAt, lang }
import { OMR_PRE_EXAM_SECONDS } from './omr';
import { loadResumeData } from './examEngine';

const PREFIX = 'tce_omr_pre_';
export const preKey = (userId, testId) => `${PREFIX}${userId}_${testId}`;

export function loadPre(userId, testId) {
  try { return JSON.parse(localStorage.getItem(preKey(userId, testId)) || 'null'); } catch (e) { return null; }
}
export function savePre(userId, testId, rec) {
  try { localStorage.setItem(preKey(userId, testId), JSON.stringify(rec)); } catch (e) { /* storage unavailable */ }
}
export function clearPre(userId, testId) {
  try { localStorage.removeItem(preKey(userId, testId)); } catch (e) { /* ignore */ }
}
export const preDueAt = (rec) => rec.startedAt + OMR_PRE_EXAM_SECONDS * 1000;

// What (if anything) an Offline / OMR exam needs to do right now for this student:
//   { type: 'resume',    testId } — an OMR exam is running/was interrupted: go back into it
//   { type: 'autostart', testId } — the 5-minute window is over: start the exam
// Ordinary (non-OMR) exams are never reported here, so they behave exactly as before.
export function findPendingOmrAction(userId) {
  if (!userId) return null;
  const resume = loadResumeData(userId);
  if (resume && resume.omr && resume.testId) return { type: 'resume', testId: resume.testId };
  try {
    const prefix = `${PREFIX}${userId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const rec = JSON.parse(localStorage.getItem(k) || 'null');
      if (rec && rec.startedAt && !rec.proceeded && Date.now() >= preDueAt(rec)) {
        return { type: 'autostart', testId: k.slice(prefix.length) };
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}
