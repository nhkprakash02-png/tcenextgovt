'use client';

// Strict round-robin set assignment for Offline / OMR Full Mocks: the 1st student gets Set A, the
// 2nd Set B, the 3rd Set C, the 4th Set D, the 5th Set A again, and so on.
//
// The rotation lives in one small Firestore document per test ("omr_assign_<testId>", stored next
// to the app's other data in the tce_app_data collection, so no new security rules are needed).
// It is updated inside a Firestore TRANSACTION, so two students tapping Start at the same moment
// can never receive the same turn.
//
// RESET ON UNLOCK: every time the admin presses "Unlock for Enrolled Students" the test gets a new
// `omrUnlockSession` id. The saved rotation belongs to one session id; when the id changes, the
// rotation starts over from Set A. Locking and unlocking again therefore always restarts at Set A.
import { doc, runTransaction } from 'firebase/firestore';
import { fbDB } from '../firebase';
import { OMR_SET_LETTERS } from './omr';

// The rule itself, kept separate so it can be tested on its own.
// `current` is the saved rotation ({ session, next, assigned }) or null.
export function nextAssignment(current, sessionId, studentId) {
  const fresh = !current || current.session !== sessionId; // new unlock session -> start again from Set A
  const data = fresh
    ? { session: sessionId, next: 0, assigned: {} }
    : { session: current.session, next: Number(current.next) || 0, assigned: { ...(current.assigned || {}) } };
  const existing = data.assigned[studentId];
  if (existing && OMR_SET_LETTERS.includes(existing)) {
    // The same student asking again in the same session keeps the set they already have.
    return { letter: existing, data, changed: fresh };
  }
  const letter = OMR_SET_LETTERS[data.next % OMR_SET_LETTERS.length];
  data.next += 1;
  data.assigned[studentId] = letter;
  return { letter, data, changed: true };
}

const RETRYABLE = ['aborted', 'failed-precondition', 'resource-exhausted', 'unavailable', 'deadline-exceeded'];

// Returns the set letter ('A'–'D') for this student, taking the next turn in the rotation.
// Throws if the rotation cannot be reached (e.g. no internet) — the caller shows a message.
export async function assignOmrSet(test, studentId) {
  if (!fbDB) return OMR_SET_LETTERS[0];
  const sessionId = String(test.omrUnlockSession || 'initial');
  const ref = doc(fbDB, 'tce_app_data', `omr_assign_${test.id}`);
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await runTransaction(fbDB, async (tx) => {
        const snap = await tx.get(ref);
        const { letter, data, changed } = nextAssignment(snap.exists() ? snap.data() : null, sessionId, studentId);
        if (changed) tx.set(ref, data);
        return letter;
      });
    } catch (e) {
      lastError = e;
      if (!RETRYABLE.includes(e && e.code)) break;
      // Many students tapping at once make Firestore ask us to retry: wait a moment and try again.
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
    }
  }
  throw lastError || new Error('Could not assign a set');
}
