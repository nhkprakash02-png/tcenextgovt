// Server-only. Only ever imported from src/app/api/ routes. Uses plain fetch() against Resend's
// REST API rather than adding their SDK as a dependency — same approach as razorpayServer.js,
// keeps this integration to zero new npm packages.
const FROM_ADDRESS = 'TCE - The Competitive Edge <noreply@tcenahata.in>';

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is missing.');
  if (!to) throw new Error('sendEmail called with no recipient address.');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Resend API request failed.');
  return data;
}
