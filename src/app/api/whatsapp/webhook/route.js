// WhatsApp Cloud API webhook — STUDENT WEBSITE only.
//   GET  /api/whatsapp/webhook : Meta calls this once to verify the webhook URL.
//   POST /api/whatsapp/webhook : Meta calls this for every incoming WhatsApp message.
//
// Bot greeting: when someone messages the official number, they get the welcome reply once. To
// avoid spamming a person who keeps chatting, the greeting is sent at most once every 24 hours
// per phone number (tracked in the server-only Firestore collection tce_whatsapp_state, written
// with the Admin SDK — your Firestore rules already deny browsers access to it).
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { adminDB } from '../../../../lib/firebaseAdmin';
import { sendWhatsAppText } from '../../../../lib/whatsapp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COLLECTION = 'tce_whatsapp_state';
const GREET_EVERY_MS = 24 * 60 * 60 * 1000;

const GREETING = `👋 Hello and welcome to TCE Nahata! 
Thank you for reaching out. Our support team has received your message and will get back to you shortly. Meanwhile, you can explore our courses and mock tests on our website: https://tcenahata.in 
Stay focused and keep learning! 🚀`;

// Meta's one-time check when you save the webhook in the developer dashboard.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected) {
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

function signatureIsValid(rawBody, header) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = header.slice('sha256='.length);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(given, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function greetIfDue(waId, messageId) {
  const ref = adminDB.collection(STATE_COLLECTION).doc(waId);
  const snap = await ref.get();
  const state = snap.exists ? snap.data() : {};
  if (state.lastMessageId === messageId) return; // Meta re-delivered the same message
  const last = state.lastGreetedAt ? Number(state.lastGreetedAt) : 0;
  if (Date.now() - last < GREET_EVERY_MS) return;  // already greeted recently
  // Claim first so two near-simultaneous deliveries can't both send.
  await ref.set({ lastGreetedAt: Date.now(), lastMessageId: messageId }, { merge: true });
  try {
    await sendWhatsAppText(waId, GREETING);
  } catch (e) {
    await ref.set({ lastGreetedAt: 0 }, { merge: true }); // let the next message try again
    throw e;
  }
}

export async function POST(request) {
  const raw = await request.text();
  if (!signatureIsValid(raw, request.headers.get('x-hub-signature-256'))) {
    return new Response('Invalid signature', { status: 403 });
  }
  try {
    const body = JSON.parse(raw);
    const ownPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        if (ownPhoneId && value.metadata && value.metadata.phone_number_id && value.metadata.phone_number_id !== ownPhoneId) continue;
        for (const msg of value.messages || []) { // delivery/read receipts arrive as "statuses" and are ignored
          if (msg.from && msg.id) {
            try { await greetIfDue(msg.from, msg.id); } catch (e) { console.error('[whatsapp-webhook] greeting failed for', msg.from, e && e.message); }
          }
        }
      }
    }
  } catch (e) {
    console.error('[whatsapp-webhook] could not process payload', e && e.message);
  }
  // Always answer 200 once the signature is valid, otherwise Meta keeps retrying the same event.
  return NextResponse.json({ ok: true });
}
