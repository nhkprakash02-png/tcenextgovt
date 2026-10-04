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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fbStorage } from '../firebase';
import { validateSourcePhoto } from './imageUtils';

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
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}
