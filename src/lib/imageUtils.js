// Replaces the old Firebase-Storage-based upload with a pure client-side pipeline: validate
// size, let the user crop to a square (see ImageCropperModal.jsx), then compress that crop into
// a Base64 JPEG small enough to store directly on the student's Firestore document. No Storage
// bucket, no server round-trip for the file itself — keeps the project on the free Spark plan.

export const MAX_SOURCE_PHOTO_BYTES = 1024 * 1024; // 1MB — the ORIGINAL file picked by the student
const MAX_STORED_BASE64_BYTES = 700 * 1024; // safety ceiling for the compressed result we actually save

export function validateSourcePhoto(file) {
  if (!file) return 'No file selected.';
  if (!file.type.startsWith('image/')) return 'Please choose an image file (JPG, PNG, etc).';
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    return `Image size must be under 1MB (yours is ${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose a smaller photo.`;
  }
  return null; // valid
}

// Renders whatever is on the given canvas to a Base64 JPEG, reducing quality automatically
// until the result comfortably fits a Firestore document alongside the rest of the student's
// profile fields.
export function canvasToCompressedBase64(canvas) {
  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > MAX_STORED_BASE64_BYTES * 1.37 && quality > 0.3) { // *1.37 ~ base64 overhead
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}
