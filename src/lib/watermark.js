// Ported from index.html lines ~2364-2409.
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

async function loadPdfBytesFromMaterial(mat) {
  if (!mat || !mat.url) return null;
  try {
    if (mat.url.startsWith('data:')) {
      const base64 = mat.url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    const res = await fetch(mat.url);
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    console.warn('Could not load material source PDF, falling back to placeholder.', e);
    return null;
  }
}

// `user` is passed in explicitly (React has no getCurrentUser() global) — pass the current
// user from useApp() at the call site.
export async function buildWatermarkedPdfBytes(mat, user) {
  const title = typeof mat === 'string' ? mat : mat.title;
  const matObj = typeof mat === 'string' ? { title, url: '' } : mat;
  const licenseText = `Licensed to: ${user ? user.name : 'Guest'} | ${user ? (user.phone || user.email) : ''} — TCE - The Competitive Edge`;
  const sourceBytes = await loadPdfBytesFromMaterial(matObj);

  if (sourceBytes) {
    try {
      const pdfDoc = await PDFDocument.load(sourceBytes);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      pdfDoc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText('TCE', { x: width / 2 - 90, y: height / 2 - 40, size: Math.min(width, height) * 0.28, font, color: rgb(0.6, 0.6, 0.6), opacity: 0.09, rotate: degrees(35) });
        page.drawText(licenseText, { x: 20, y: 14, size: 8, font, color: rgb(0.55, 0.55, 0.55), opacity: 0.85 });
      });
      return await pdfDoc.save();
    } catch (e) {
      console.warn('Uploaded file could not be parsed as PDF, using placeholder instead.', e);
    }
  }

  // Fallback placeholder (used when no PDF has been uploaded for this material yet)
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([595, 842]);
  page.drawText('TCE - The Competitive Edge', { x: 50, y: 780, size: 20, font, color: rgb(0.83, 0.55, 0.05) });
  page.drawText(title, { x: 50, y: 745, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('No PDF has been uploaded for this material yet. Upload one via the Admin Panel.', { x: 50, y: 700, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('TCE', { x: 180, y: 420, size: 90, font, color: rgb(0.9, 0.9, 0.9), opacity: 0.08, rotate: degrees(30) });
  page.drawText(licenseText, { x: 50, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6) });
  return await pdfDoc.save();
}
