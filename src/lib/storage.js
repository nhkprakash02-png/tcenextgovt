// Profile photo upload — legacy/unused. Enforces the 1MB client-side cap before ever touching
// the network (protects the Firebase Storage free tier quota), then uploads to
// `profile-photos/{studentId}` and returns the public download URL to save onto the
// student's Firestore record.
//
// NOTE: nothing in the app imports this module. Profile photos are cropped client-side and
// stored as compressed Base64 strings directly on the student's Firestore document instead
// (see lib/imageUtils.js + components/ImageCropperModal.jsx), which is what keeps the project
// on Firebase's free Spark plan without enabling a Storage bucket at all.
//
// It previously imported a named export `fbStorage` from ../firebase that does not exist —
// firebase.js deliberately only exports fbApp, fbAuth and fbDB. That was harmless under plain
// JS (the file is never bundled), but it is a hard compile error the moment TypeScript, or
// `checkJs`, or any strict bundler/linter looks at this file. It now derives the Storage
// instance lazily from the exported `fbApp` instead, so the import is valid. `getStorage` is
// called inside the function, never at module scope, so merely importing this file still does
// NOT initialize a Storage bucket — behaviour is unchanged.
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fbApp } from '../firebase';

export const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024; // 1MB

export async function uploadProfilePhoto(file, studentId) {
  if (!fbApp) throw new Error('Photo storage is not available right now. Please try again later.');
  if (!file) throw new Error('No file selected.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG, PNG, etc).');
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error(`That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — please choose one under 1MB (try a smaller photo, or compress/resize it first).`);
  }
  const fbStorage = getStorage(fbApp);
  const storageRef = ref(fbStorage, `profile-photos/${studentId}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
