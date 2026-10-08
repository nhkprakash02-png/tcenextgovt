// Server-only helper for the Meta WhatsApp Business Cloud API.
// NEVER import this from a component or any 'use client' file: it uses the secret access token.
//
// Needs these environment variables (set in Vercel, never in the code):
//   WHATSAPP_ACCESS_TOKEN      - permanent System User token from Meta
//   WHATSAPP_PHONE_NUMBER_ID   - the Phone Number ID from the WhatsApp API Setup page
//   WHATSAPP_GRAPH_VERSION     - optional, defaults to v23.0

export class WhatsAppError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.status = status;
  }
}

// Turns a stored phone number into the digits-only international format WhatsApp wants
// (country code first, no "+", no spaces). 10-digit numbers are treated as Indian (+91).
export function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) return '91' + d;
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1);
  if (d.length >= 11 && d.length <= 15) return d;
  return '';
}

async function callMessagesApi(payload) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    throw new WhatsAppError('WhatsApp is not configured on the server (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID).', 'not_configured', 500);
  }
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data && data.error ? data.error : {};
    throw new WhatsAppError(err.error_data && err.error_data.details ? err.error_data.details : (err.message || 'WhatsApp request failed'), err.code, res.status);
  }
  return data;
}

// Free-form text. WhatsApp only allows this inside the 24 hours after the person last messaged
// your number (e.g. replying to someone who just wrote to you).
export function sendWhatsAppText(to, body) {
  return callMessagesApi({ to, type: 'text', text: { body, preview_url: true } });
}

// Pre-approved template message. Required for messaging someone first / outside the 24h window.
export function sendWhatsAppTemplate(to, templateName, languageCode, bodyParams = []) {
  return callMessagesApi({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'en' },
      components: bodyParams.length
        ? [{ type: 'body', parameters: bodyParams.map((t) => ({ type: 'text', text: String(t) })) }]
        : [],
    },
  });
}
