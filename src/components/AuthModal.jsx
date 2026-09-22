'use client';

import React, { useState } from 'react';
import { signInWithRedirect } from 'firebase/auth';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { uid } from '../lib/utils';
import { fbAuth, googleProvider, DEMO_MODE } from '../firebase';

export function AccountModal() {
  const { user, setTab, closeModal, logout } = useApp();
  return (
    <Modal title="My Account">
      <p className="text-sm muted">Signed in as</p>
      <p className="font-semibold">{user.name}</p>
      <p className="text-xs muted">{user.email || user.phone}</p>
      <div className="flex gap-2 mt-5">
        <button onClick={() => { closeModal(); setTab('dashboard'); }} className="flex-1 btn-gold rounded-lg py-2.5 text-sm font-bold">Go to Dashboard</button>
        <button
          onClick={() => { logout(); closeModal(); setTab('home'); }}
          className="flex-1 btn-ghost rounded-lg py-2.5 text-sm font-bold"
        >Logout</button>
      </div>
    </Modal>
  );
}

export default function AuthModal() {
  const { user, DB, saveDB, setUser, closeModal, setTab } = useApp();
  const [tab, setLocalTab] = useState('login');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', confirm: '' });

  if (user) return <AccountModal />;

  const loginUser = () => {
    const email = (form.email || '').trim().toLowerCase();
    const password = form.password || '';
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    const student = DB.students.find((s) => (s.email || '').toLowerCase() === email);
    if (!student || !student.password || student.password !== password) { setError('Invalid email or password.'); return; }
    setUser(student); closeModal(); setTab('dashboard');
  };

  const signupUser = () => {
    const { name, email, phone, password, confirm } = form;
    if (!name || !email || !phone || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (DB.students.some((s) => (s.email || '').toLowerCase() === email.toLowerCase())) { setError('An account with this email already exists. Please login instead.'); return; }
    const student = { id: uid('st'), name, email, phone, password, address: '', joinDate: new Date().toISOString().slice(0, 10), registeredAt: new Date().toISOString(), paymentStatus: 'Not Enrolled', batch: '—', pendingReview: true };
    saveDB((prev) => ({ ...prev, students: [...prev.students, student] }));
    setUser(student); closeModal(); setTab('dashboard');
  };

  // Always uses signInWithRedirect (never a popup): popups are unreliable across browsers
  // (frequently blocked, and behave inconsistently in in-app browsers like Instagram/Facebook's
  // built-in webview) and don't persist a session as reliably. The actual post-redirect login
  // handling (matching an existing student, or opening the registration modal for a new one)
  // lives in AppContext.jsx's getRedirectResult() effect, since the browser fully navigates
  // away and back for this flow — there's no "after" callback to run here.
  const googleSignIn = () => {
    if (DEMO_MODE || !fbAuth) return;
    signInWithRedirect(fbAuth, googleProvider).catch((e) => {
      if (e.code === 'auth/unauthorized-domain') { alert("Google sign-in failed: this website's domain is not yet added to the Authorized Domains list in Firebase Authentication settings. Please contact the site admin."); return; }
      alert('Google sign-in failed: ' + e.message);
    });
  };

  const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm';

  return (
    <Modal title="Student Account">
      <div className="flex gap-2 mb-4 card2 rounded-lg p-1">
        <button onClick={() => { setLocalTab('login'); setError(''); }} className={`flex-1 rounded-md py-2 text-xs font-bold ${tab === 'login' ? 'tab-active' : 'muted'}`}>Login</button>
        <button onClick={() => { setLocalTab('signup'); setError(''); }} className={`flex-1 rounded-md py-2 text-xs font-bold ${tab === 'signup' ? 'tab-active' : 'muted'}`}>Create Account</button>
      </div>

      {tab === 'login' ? (
        <div className="space-y-3">
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loginUser()} className={inputCls} />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loginUser()} className={inputCls} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={loginUser} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Login</button>
        </div>
      ) : (
        <div className="space-y-3">
          <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          <input type="password" placeholder="Confirm Password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && signupUser()} className={inputCls} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={signupUser} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Create Account</button>
        </div>
      )}

      <div className="text-center text-xs muted my-4">— or —</div>
      <button onClick={googleSignIn} className="w-full flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l6-6C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" /></svg>
        Continue with Google
      </button>
    </Modal>
  );
}

export function GoogleRegisterModal({ profile }) {
  const { DB, saveDB, setUser, closeModal, setTab } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const complete = () => {
    const name = (profile.name || '').trim();
    const email = profile.email || '';
    if (!name || !phone || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (DB.students.some((s) => (s.email || '').toLowerCase() === email.toLowerCase())) { setError('An account with this email already exists. Please login instead.'); return; }
    const student = { id: uid('st'), name, email, phone, password, photoURL: profile.photoURL || '', address: '', joinDate: new Date().toISOString().slice(0, 10), registeredAt: new Date().toISOString(), paymentStatus: 'Not Enrolled', batch: '—', pendingReview: true };
    saveDB((prev) => ({ ...prev, students: [...prev.students, student] }));
    setUser(student); closeModal(); setTab('dashboard');
  };

  const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm';
  return (
    <Modal title="Complete Your Profile">
      <p className="text-xs muted mb-4">You're signed in with Google — just a few more details to finish setting up your account.</p>
      <div className="space-y-3">
        <input type="text" defaultValue={profile.name || ''} placeholder="Full Name" className={inputCls} disabled />
        <input type="email" defaultValue={profile.email || ''} readOnly placeholder="Email" className={`${inputCls} opacity-70 cursor-not-allowed`} />
        <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && complete()} className={inputCls} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={complete} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Complete Registration</button>
      </div>
    </Modal>
  );
}
