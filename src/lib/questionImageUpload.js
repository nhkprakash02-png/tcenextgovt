'use client';

// Uploads an admin-provided solution image for a single question to Firebase Storage, enforcing
// the same under-1MB rule already used for profile photos (see lib/imageUtils.js —
// validateSourcePhoto is reused directly here rather than duplicated, so both places share one
// definition of "too big" and one error message).
//
// Unlike profile photos, these are NOT compressed to Base64 and stored in Firestore — question
// documents can hold many of these, and keeping them as Storage URLs instead keeps question
// documents small and fast to read. The validated file is uploaded as-is (already capped at
// 1MB by validateSourcePhoto before this function is ever called), and this returns the
// public download URL to save on the question record.
//
// FIX (endless spinner): the old version used uploadBytes(), which — when Firebase Storage
// refuses or can't reach the bucket (e.g. the project is not on the Blaze plan, the bucket is
// missing, or the rules/CORS block it) — keeps silently retrying for up to 10 minutes, so the
// admin saw a spinner that never ended. This version uses a resumable upload that is cancelled
// if no progress is made for UPLOAD_STALL_MS, and it turns Firebase's error codes into plain
// messages. It ALWAYS either returns a URL or throws an Error with a readable message.
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { fbStorage } from '../firebase';
import { validateSourcePhoto } from './imageUtils';

const UPLOAD_STALL_MS = 20000; // give up if nothing uploads for 20 seconds

function explainStorageError(err) {
  const code = (err && err.code) || '';
  if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
    return 'Firebase Storage rejected the upload (permission denied). Check your Storage Rules: they must allow writes to the "question-solutions/" folder.';
  }
  if (code === 'storage/bucket-not-found' || code === 'storage/no-default-bucket' || code === 'storage/project-not-found') {
    return 'No Firebase Storage bucket was found for this project. Open Firebase Console > Storage and check that Storage is set up.';
  }
  if (code === 'storage/quota-exceeded') {
    return 'Firebase Storage quota exceeded. Free up space or upgrade the Firebase plan.';
  }
  if (code === 'storage/retry-limit-exceeded') {
    return 'The upload timed out. Please check your internet connection and try again.';
  }
  if (code === 'storage/canceled') {
    return 'The upload was cancelled.';
  }
  return (err && err.message) || 'Upload failed. Please try again.';
}

export async function uploadQuestionSolutionImage(file, { testId, subject, questionId }) {
  const validationError = validateSourcePhoto(file);
  if (validationError) throw new Error(validationError);
  if (!fbStorage) throw new Error('Image upload is unavailable right now. Please try again in a moment.');

  // Path groups images by test/subject so Storage stays browsable/debuggable from the Firebase
  // console, and includes the file's own extension so content-type is inferred correctly.
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeSegment = (s) => String(s || 'misc').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `question-solutions/${safeSegment(subject)}/${safeSegment(testId)}/${safeSegment(questionId)}.${ext}`;

  const storageRef = ref(fbStorage, path);
  try {
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
      let timer = null;
      const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try { task.cancel(); } catch (e) { /* ignore */ }
          reject(new Error(
            'The upload did not start or stalled, so it was stopped. Firebase Storage may be unavailable for this project '
            + '(since 3 Feb 2026 Cloud Storage needs the Blaze plan), or the Storage rules/bucket are blocking it. '
            + 'Check Firebase Console > Storage.'
          ));
        }, UPLOAD_STALL_MS);
      };
      arm();
      task.on(
        'state_changed',
        () => arm(), // any progress resets the stall timer
        (err) => { clearTimeout(timer); reject(err); },
        () => { clearTimeout(timer); resolve(); },
      );
    });
    // getDownloadURL normally returns instantly after a successful upload; the race is only a
    // safety net so this step can never hang the spinner either.
    return await Promise.race([
      getDownloadURL(storageRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Upload finished but the photo link could not be fetched. Please try again.')), 15000)),
    ]);
  } catch (err) {
    throw new Error(explainStorageError(err));
  }
}
