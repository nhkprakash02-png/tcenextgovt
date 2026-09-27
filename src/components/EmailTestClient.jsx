'use client';

// Private test utility — NOT linked from anywhere in the site's navigation, so regular
// visitors will never stumble onto it. Lets you send any of the 3 email templates, with
// realistic sample data, to any address you type in — without a real Google login, a real
// Razorpay payment, or asking an admin to grant access. Nothing in Firestore is touched by this
// page; it only calls /api/email/test-send, which is itself protected by a separate secret (see
// .env.example: EMAIL_TEST_SECRET) so this can't be misused even if someone finds the URL.
import React, { useState } from 'react';

export default function EmailTestClient() {
  const [to, setTo] = useState('');
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState('');

  const send = async (type) => {
    setStatus('Sending…');
    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to, secret }),
      });
      const data = await res.json();
      setStatus(res.ok ? `✅ Sent "${type}" template to ${to}` : `❌ ${data.error || 'Failed'}`);
    } catch (err) {
      setStatus('❌ ' + err.message);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px' };
  const btnStyle = { padding: '10px 16px', marginRight: '8px', marginBottom: '8px', borderRadius: '8px', border: 'none', background: '#F59E0B', color: '#0B0B0B', fontWeight: 'bold', cursor: 'pointer' };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Email Template Test Page</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Sends realistic sample data — no real student/payment/admin action needed.</p>

      <label style={{ fontSize: 13, fontWeight: 'bold' }}>Send test emails to:</label>
      <input type="email" placeholder="your.email@example.com" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />

      <label style={{ fontSize: 13, fontWeight: 'bold' }}>Secret (from Vercel env var EMAIL_TEST_SECRET):</label>
      <input type="password" placeholder="paste EMAIL_TEST_SECRET here" value={secret} onChange={(e) => setSecret(e.target.value)} style={inputStyle} />

      <div style={{ marginTop: 8 }}>
        <button style={btnStyle} onClick={() => send('welcome')}>Send Welcome Email</button>
        <button style={btnStyle} onClick={() => send('payment')}>Send Payment Confirmation</button>
        <button style={btnStyle} onClick={() => send('enrollment')}>Send Enrollment Confirmation</button>
      </div>

      {status && <p style={{ marginTop: 16, fontSize: 14 }}>{status}</p>}
    </div>
  );
}
