// ============================================================================
// EMAIL TEMPLATES — edit the wording in this file whenever you want to change
// what any of the three automated emails say. Everything below WRAP_STYLES is
// just plain text/HTML content; you don't need to understand the rest of the
// app to change it.
// ============================================================================
//
// Brand colors match the rest of the site exactly (tailwind.config.js: gold
// #F59E0B, ink/black #0B0B0B). Inline CSS is used throughout (rather than a
// <style> block) because most email apps strip external/blocked stylesheets —
// inline styles are the only reliable way to keep formatting in Gmail, Outlook,
// etc.

const BRAND_GOLD = '#F59E0B';
const BRAND_BLACK = '#0B0B0B';

// Shared header/footer shell every email is wrapped in, so all three always
// look consistent. If you want to change the logo, footer text, or overall
// layout (not just one email's wording), edit THIS function.
function wrapEmailHtml({ preheader, bodyHtml }) {
  return `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: Arial, Helvetica, sans-serif;">
    <!-- Preheader: hidden preview text shown next to the subject line in inbox lists -->
    <div style="display:none; max-height:0; overflow:hidden;">${preheader || ''}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background-color:${BRAND_BLACK}; padding:24px; text-align:center;">
                <div style="color:${BRAND_GOLD}; font-size:22px; font-weight:800; letter-spacing:0.02em;">TCE</div>
                <div style="color:#ffffff; font-size:13px; margin-top:2px;">The Competitive Edge</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px; color:#1f2937; font-size:14px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#f4f4f5; padding:16px 24px; text-align:center; color:#6b7280; font-size:11px;">
                TCE — The Competitive Edge · Nahata, North 24 Parganas, West Bengal<br />
                This is an automated message, please do not reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ----------------------------------------------------------------------------
// 1. WELCOME EMAIL — sent once, the first time a student logs in with Google.
// EDIT THE WORDING BELOW to whatever you'd like it to say.
// ----------------------------------------------------------------------------
export function welcomeEmail({ name }) {
  const subject = 'Welcome to TCE — The Competitive Edge! 🎉';
  const bodyHtml = `
    <h2 style="margin:0 0 12px; color:${BRAND_BLACK};">Welcome aboard, ${escapeHtml(name)}! 👋</h2>
    <p>Thank you for joining <strong>TCE — The Competitive Edge</strong>. We're genuinely glad to have you with us.</p>
    <p>Whether you're preparing for WBP, KP SI, SSC GD Constable, Railway (RRB), or any other competitive government exam — we're here to support every step of your journey, from your first mock test to the day you get your result.</p>
    <p>Explore Mock Tests, PYQs, Daily Quizzes and Study Materials from your dashboard any time.</p>
    <p style="margin-top:20px;">Wishing you focus, consistency, and every success ahead.</p>
    <p style="margin-top:20px; font-weight:bold;">— Team TCE</p>
  `;
  return { subject, html: wrapEmailHtml({ preheader: 'Welcome to TCE — glad to have you with us!', bodyHtml }) };
}

// ----------------------------------------------------------------------------
// 2. PAYMENT CONFIRMATION EMAIL — sent after a Razorpay payment is verified.
// EDIT THE WORDING BELOW to whatever you'd like it to say.
// ----------------------------------------------------------------------------
export function paymentConfirmationEmail({ name, batchName, amount, paymentId, orderId, date }) {
  const subject = `Payment Confirmed — ${batchName} | TCE`;
  const bodyHtml = `
    <h2 style="margin:0 0 12px; color:${BRAND_BLACK};">Payment received, ${escapeHtml(name)}! ✅</h2>
    <p>Thank you for enrolling — your payment has been successfully received and your access is now active.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
      <tr><td style="padding:10px 14px; background:#f9fafb; font-weight:bold; width:45%;">Batch / Course</td><td style="padding:10px 14px;">${escapeHtml(batchName)}</td></tr>
      <tr><td style="padding:10px 14px; background:#f9fafb; font-weight:bold;">Amount Paid</td><td style="padding:10px 14px;">₹${amount}</td></tr>
      <tr><td style="padding:10px 14px; background:#f9fafb; font-weight:bold;">Date</td><td style="padding:10px 14px;">${escapeHtml(date)}</td></tr>
      <tr><td style="padding:10px 14px; background:#f9fafb; font-weight:bold;">Payment ID</td><td style="padding:10px 14px; font-family: monospace; font-size:12px;">${escapeHtml(paymentId)}</td></tr>
      <tr><td style="padding:10px 14px; background:#f9fafb; font-weight:bold;">Order ID</td><td style="padding:10px 14px; font-family: monospace; font-size:12px;">${escapeHtml(orderId)}</td></tr>
    </table>
    <p>Keep this email as your receipt for this transaction.</p>
    <p style="margin-top:20px;">We're excited to have you in this batch — work hard, stay consistent, and we'll be right there supporting you.</p>
    <p style="margin-top:20px; font-weight:bold;">— Team TCE</p>
  `;
  return { subject, html: wrapEmailHtml({ preheader: `Your payment for ${batchName} is confirmed.`, bodyHtml }) };
}

// ----------------------------------------------------------------------------
// 3. ENROLLMENT CONFIRMATION EMAIL — sent when an admin manually grants access
// (no payment involved). EDIT THE WORDING BELOW to whatever you'd like it to say.
// ----------------------------------------------------------------------------
export function enrollmentConfirmationEmail({ name, batchName }) {
  const subject = `You're Enrolled — ${batchName} | TCE`;
  const bodyHtml = `
    <h2 style="margin:0 0 12px; color:${BRAND_BLACK};">You're all set, ${escapeHtml(name)}! 🎓</h2>
    <p>Your enrollment has been confirmed — you've been added to <strong>${escapeHtml(batchName)}</strong>, and your full access is now active.</p>
    <p>Head to your dashboard any time to explore mock tests, materials, and everything included in this batch.</p>
    <p style="margin-top:20px;">Welcome in — we're looking forward to seeing you succeed.</p>
    <p style="margin-top:20px; font-weight:bold;">— Team TCE</p>
  `;
  return { subject, html: wrapEmailHtml({ preheader: `You've been enrolled in ${batchName}.`, bodyHtml }) };
}

// Small helper so a student's name/batch name can never accidentally break the
// HTML structure (e.g. if it happened to contain a `<` character).
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
