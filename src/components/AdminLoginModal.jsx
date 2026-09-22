'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';

// NOTE ON SECURITY: the original checks the admin password client-side against a constant
// baked into the bundle (ADMIN_EMAIL / ADMIN_PASSWORD_DEFAULT). That's fine for a quick demo
// but anyone can read it straight out of the shipped JS. See README "Security notes" for a
// recommended fix (Firebase custom claims / a real admin auth flow) before relying on this
// for anything more than "has clicked the door labeled admin."
const ADMIN_EMAIL = 'tcenahata@gmail.com';
const ADMIN_PASSWORD_DEFAULT = 'X@x1234567';

export default function AdminLoginModal() {
  const { setAdmin, closeModal, openModal } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const login = () => {
    const validEmail = ADMIN_EMAIL.trim().toLowerCase();
    if (email.trim().toLowerCase() === validEmail && pass.trim() === ADMIN_PASSWORD_DEFAULT) {
      setAdmin(true);
      closeModal();
      openModal('adminPanel');
    } else {
      setError('Invalid admin credentials. Please check your email and password.');
      setPass('');
    }
  };

  return (
    <Modal title="Admin Login">
      <div className="space-y-3">
        <input
          type="email" placeholder="Admin Email" autoComplete="off" autoCapitalize="off" spellCheck="false"
          value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()}
          className="w-full rounded-lg px-3 py-2.5 text-sm"
        />
        <input
          type="password" placeholder="Password" autoComplete="off"
          value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()}
          className="w-full rounded-lg px-3 py-2.5 text-sm"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={login} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Login</button>
      </div>
    </Modal>
  );
}
