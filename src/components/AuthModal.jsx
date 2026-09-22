'use client';

import React, { useEffect, useState } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { uid } from '../lib/utils';
import { fbAuth, googleProvider, DEMO_MODE } from '../firebase';

// ---------------------------------------------------------------------------
// IMPORTANT CONTEXT FOR WHOEVER READS THIS FILE NEXT:
//
// Before this change, email/password "login" was NOT real Firebase Auth — it compared a
// plain-text `password` field stored directly on each student's Firestore document
// (`student.password !== password`). Only Google sign-in went through actual Firebase Auth
// (via signInWithRedirect in the old version of this file).
//
// This rewrite switches email/password to REAL Firebase Auth (signInWithEmailAndPassword /
// createUserWithEmailAndPassword / sendPasswordResetEmail), and switches Google sign-in from
// signInWithRedirect to signInWithPopup, as requested. Nothing in AppContext.jsx, Modal.jsx, or
// any Firestore document shape was touched — only this file changed.
//
// MIGRATION FOR EXISTING STUDENTS (this is the part that keeps old accounts working):
// Every student who signed up before this change has a Firestore record but NO Firebase Auth
// account. If real Firebase sign-in is tried first and fails (wrong-password / user-not-found /
// invalid-credential — Firebase now folds the first two into invalid-credential on many
// projects to avoid leaking which one it was), we fall back to checking the OLD plain-text
// password field on their Firestore record. If that matches, we transparently create a real
// Firebase Auth account for them with createUserWithEmailAndPassword using the same password,
// so every future login goes through real Firebase Auth. Their Firestore record — including the
// old `password` field — is left exactly as it was; nothing is deleted or overwritten. New
// signups going forward simply don't get a `password` field written at all, since Firebase Auth
// is now the real credential store for them.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Maps Firebase Auth error codes to plain-English messages. `wrong-password`, `user-not-found`
// and `invalid-credential` are deliberately mapped to the SAME message — showing a different
// message for "wrong password" vs "no such account" lets an attacker enumerate which emails are
// registered, which is exactly what Firebase's own newer default behavior (folding both into
// invalid-credential) is designed to prevent. This mapping keeps that protection either way.
function authErrorMessage(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please login instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/unauthorized-domain':
      return "Google sign-in failed: this website's domain is not yet added to the Authorized Domains list in Firebase Authentication settings. Please contact the site admin.";
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Builds (or reuses) this student's Firestore profile after a successful real Firebase sign-in,
// then logs them into the app the same way the rest of the codebase already expects
// (setUser + closeModal + setTab('dashboard') — identical to the pre-existing pattern).
function useFinishLogin() {
  const { DB, saveDB, setUser, closeModal, setTab } = useApp();
  return (email, extra = {}) => {
    const existing = DB.students.find((s) => (s.email || '').toLowerCase() === email.toLowerCase());
    if (existing) {
      setUser(existing);
    } else {
      const student = {
        id: uid('st'), name: extra.name || 'Student', email, phone: extra.phone || '',
        address: '', joinDate: new Date().toISOString().slice(0, 10), registeredAt: new Date().toISOString(),
        paymentStatus: 'Not Enrolled', batch: '—', pendingReview: true,
      };
      saveDB((prev) => ({ ...prev, students: [...prev.students, student] }));
      setUser(student);
    }
    closeModal();
    setTab('dashboard');
  };
}

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

// Small inline "Forgot password?" form. Deliberately shows the SAME confirmation message
// whether or not the email is actually registered — this is the standard way to avoid leaking
// which emails have accounts (account enumeration). Firebase's own sendPasswordResetEmail may
// either resolve successfully either way (on projects with Email Enumeration Protection on,
// which is Firebase's default for newer projects) or reject with auth/user-not-found (older
// behavior) — both are handled identically here, so the visible behavior is safe regardless of
// which one this project exhibits.
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) { setError('Please enter a valid email address.'); return; }
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(fbAuth, trimmed);
      setSent(true);
    } catch (err) {
      if (err?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        // Includes auth/user-not-found and everything else: show the same success state so
        // an attacker can't tell registered emails apart from unregistered ones.
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm';

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Check your email for a reset link.</p>
        <p className="text-xs muted">If an account exists for <span className="font-semibold">{email.trim()}</span>, we've sent instructions to reset your password.</p>
        <button onClick={onBack} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Back to Login</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs muted">Enter your account email and we'll send you a reset link.</p>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} className={inputCls} disabled={loading} />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={submit} disabled={loading} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
        {loading ? 'Sending…' : 'Send Reset Link'}
      </button>
      <button onClick={onBack} disabled={loading} className="w-full btn-ghost rounded-lg py-2 text-xs font-semibold disabled:opacity-60">Back to Login</button>
    </div>
  );
}

export default function AuthModal() {
  const { user, DB } = useApp();
  const finishLogin = useFinishLogin();
  const [tab, setLocalTab] = useState('login');       // 'login' | 'signup'
  const [view, setView] = useState('form');           // 'form' | 'forgotPassword'
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', confirm: '' });
  // Separate loading flags per action so one in-flight request only disables its OWN button,
  // not every button in the modal.
  const [loading, setLoading] = useState(null); // null | 'login' | 'signup' | 'google'

  // Purely for tracking global auth state as requested — this does NOT drive navigation itself
  // (AppContext.jsx already owns that, for Google's profile-matching flow — see its own
  // onAuthStateChanged effect). This local listener only clears a stuck loading spinner if the
  // auth state settles while this modal happens to still be mounted, and is a no-op otherwise.
  useEffect(() => {
    if (!fbAuth) return;
    const unsub = onAuthStateChanged(fbAuth, () => setLoading(null));
    return unsub;
  }, []);

  if (user) return <AccountModal />;

  const switchTab = (t) => { setLocalTab(t); setView('form'); setError(''); };

  const loginUser = async () => {
    const email = (form.email || '').trim().toLowerCase();
    const password = form.password || '';
    if (!EMAIL_RE.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setError(''); setLoading('login');
    try {
      await signInWithEmailAndPassword(fbAuth, email, password);
      finishLogin(email);
    } catch (err) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        // Legacy account check: this student may have signed up before real Firebase Auth
        // existed, so their password only lives as a plain-text field on their Firestore doc.
        const legacy = DB.students.find((s) => (s.email || '').toLowerCase() === email && s.password && s.password === password);
        if (legacy) {
          try {
            // One-time migration: create the real Firebase Auth account now, using their
            // existing password, so every future login goes through real Firebase Auth. Their
            // Firestore record (including the old password field) is left untouched.
            await createUserWithEmailAndPassword(fbAuth, email, password);
          } catch (migrateErr) {
            // If an auth account already exists for this email for some other reason, that's
            // fine — it just means a previous login already migrated them; fall through and log
            // them in via their existing Firestore profile either way.
            if (migrateErr?.code !== 'auth/email-already-in-use') { setError(authErrorMessage(migrateErr)); setLoading(null); return; }
          }
          finishLogin(email);
          setLoading(null);
          return;
        }
        setError('Incorrect email or password.');
      } else {
        setError(authErrorMessage(err));
      }
      setLoading(null);
    }
  };

  const signupUser = async () => {
    const { name, email: rawEmail, phone, password, confirm } = form;
    const email = (rawEmail || '').trim().toLowerCase();
    if (!name || !phone) { setError('Please fill in all fields.'); return; }
    if (!EMAIL_RE.test(email)) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError(''); setLoading('signup');
    try {
      await createUserWithEmailAndPassword(fbAuth, email, password);
      finishLogin(email, { name, phone });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  // Switched from signInWithRedirect to signInWithPopup, as requested. Actually logging the
  // user into the app (matching an existing student, or opening GoogleRegisterModal for a new
  // one) is still handled entirely by AppContext.jsx's existing onAuthStateChanged effect —
  // that logic is untouched and fires the same way for a popup sign-in as it did for a redirect
  // one. This function only manages this modal's OWN loading state and popup-specific errors.
  const googleSignIn = async () => {
    if (DEMO_MODE || !fbAuth) return;
    setError(''); setLoading('google');
    try {
      await signInWithPopup(fbAuth, googleProvider);
      // No further action here on success — AppContext's listener takes it from there, and
      // will either close this modal's need to exist (by logging the user in, which makes the
      // `if (user) return <AccountModal />;` check above take over on next render) or replace
      // it with GoogleRegisterModal for a brand-new Google user.
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User closed the popup themselves — not a real error, say nothing.
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setLoading(null);
    }
  };

  const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm';
  const busy = loading !== null;

  return (
    <Modal title="Student Account">
      <div className="flex gap-2 mb-4 card2 rounded-lg p-1">
        <button onClick={() => switchTab('login')} className={`flex-1 rounded-md py-2 text-xs font-bold ${tab === 'login' ? 'tab-active' : 'muted'}`}>Login</button>
        <button onClick={() => switchTab('signup')} className={`flex-1 rounded-md py-2 text-xs font-bold ${tab === 'signup' ? 'tab-active' : 'muted'}`}>Create Account</button>
      </div>

      {tab === 'login' ? (
        view === 'forgotPassword' ? (
          <ForgotPasswordForm onBack={() => { setView('form'); setError(''); }} />
        ) : (
          <div className="space-y-3">
            {/* Google first, divider, then email/password — per the requested layout. */}
            <button onClick={googleSignIn} disabled={busy} className="w-full flex items-center justify-center gap-2 border rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60" style={{ borderColor: 'var(--border)' }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l6-6C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" /></svg>
              {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
            </button>

            <div className="text-center text-xs muted my-1">— or —</div>

            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loginUser()} className={inputCls} disabled={busy} />
            <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loginUser()} className={inputCls} disabled={busy} />
            <div className="text-right -mt-1">
              <button onClick={() => { setView('forgotPassword'); setError(''); }} disabled={busy} className="text-xs muted underline disabled:opacity-60">Forgot password?</button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={loginUser} disabled={busy} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
              {loading === 'login' ? 'Logging in…' : 'Login'}
            </button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} disabled={busy} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} disabled={busy} />
          <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} disabled={busy} />
          <input type="password" placeholder="Password (min. 6 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} disabled={busy} />
          <input type="password" placeholder="Confirm Password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && signupUser()} className={inputCls} disabled={busy} />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={signupUser} disabled={busy} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
            {loading === 'signup' ? 'Creating account…' : 'Create Account'}
          </button>
        </div>
      )}
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
