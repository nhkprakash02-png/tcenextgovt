'use client';

import React, { useState } from 'react';
import { Smartphone, MessageCircle, Loader2, CreditCard } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { priceLabel, isMobileDevice } from '../lib/utils';

export default function EnrollModal({ context, batchId }) {
  const { DB, setDB, saveDB, user, setUser, closeModal, openModal } = useApp();
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);
  // Razorpay-specific state — entirely additive; nothing below touches the manual UPI flow's
  // own state or logic.
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [payDone, setPayDone] = useState(false);

  const batch = batchId ? DB.batches.find((b) => b.id === batchId) : DB.batches[0];
  const amount = batch ? batch.price : 300;
  const batchName = batch ? batch.name : 'TCE Batch';
  const upiId = '17tanujoy-2@oksbi';
  const upiUri = `upi://pay?pa=${upiId}&pn=TCE%20Coaching&am=${amount}&cu=INR&tn=${encodeURIComponent(batchName)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;
  const mobile = isMobileDevice();
  const waHref = `https://wa.me/917384644030?text=${encodeURIComponent('Hello Sir, I have paid ' + priceLabel(amount) + ' for ' + batchName + ' enrollment. Name: ' + (user ? user.name : '') + '. Sharing payment screenshot below.')}`;

  const title = context === 'locked'
    ? 'Enroll in Batch to Unlock This Mock Test'
    : context === 'materialsLocked'
      ? 'Enroll in Batch to Unlock This Material'
      : `Enroll Now — ${priceLabel(amount)}`;

  const desc = context === 'locked'
    ? 'This Mock Test is part of our paid Mock Test series and is strictly restricted to enrolled/paid batch students. Enroll in a batch below to instantly unlock it — PYQs and Daily Quizzes remain 100% free regardless.'
    : context === 'materialsLocked'
      ? 'This Study Material is part of our paid material library and is restricted to enrolled/paid batch students. Enroll in a batch below to instantly unlock it — PYQs, Daily Quizzes and Free Demo materials remain 100% free regardless.'
      : `Unlock full access to ${batchName} for ${priceLabel(amount)}.`;

  // --- Existing manual UPI flow — UNCHANGED from before this integration ---
  const submitPaymentRef = () => {
    if (!user) { closeModal(); openModal('login'); return; }
    if (!utr.trim()) { alert('Please enter your UTR / Reference ID.'); return; }
    saveDB((prev) => {
      const idx = prev.students.findIndex((s) => s.id === user.id);
      if (idx === -1) return prev;
      const students = [...prev.students];
      const rec = { ...students[idx], paymentStatus: 'Pending', utr: utr.trim() };
      if (batch) rec.batch = batch.name;
      students[idx] = rec;
      return { ...prev, students };
    });
    alert('Payment reference submitted! Your access will be granted after admin verification (usually within a few hours).');
    closeModal();
  };

  // --- New: automated Razorpay flow ---
  const payWithRazorpay = async () => {
    if (!user) { closeModal(); openModal('login'); return; }
    if (!batch) { setPayError('This batch is not available right now.'); return; }
    if (typeof window === 'undefined' || !window.Razorpay) {
      setPayError('Payment is still loading — please wait a moment and try again.');
      return;
    }
    setPayError(''); setPayLoading(true);
    try {
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id, studentId: user.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'Could not start payment.');

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'TCE - The Competitive Edge',
        description: `Enrollment: ${order.batchName}`,
        prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' },
        theme: { color: '#F59E0B' },
        handler: async (response) => {
          // Runs only after Razorpay's own popup confirms the payment completed. This response
          // is NOT trusted on its own — verify-payment independently recomputes the signature
          // server-side before granting any access.
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                studentId: user.id,
                batchId: batch.id,
              }),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verify.error || 'Payment verification failed.');

            // Server already wrote the authoritative record via the Admin SDK — update local
            // state directly (not saveDB, which would trigger a redundant client-side write)
            // so the student sees "Enrolled" immediately, without waiting for the realtime
            // listener round-trip.
            const updatedStudent = { ...user, paymentStatus: 'Approved', batch: verify.batchName || batch.name };
            setUser(updatedStudent);
            setDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === user.id ? updatedStudent : s)) }));
            setPayDone(true);
          } catch (err) {
            setPayError(err.message || 'Payment succeeded but enrollment could not be confirmed automatically. Please contact support with your payment ID: ' + response.razorpay_payment_id);
          } finally {
            setPayLoading(false);
          }
        },
        modal: {
          // Fires if the student closes the Razorpay popup without paying — not an error.
          ondismiss: () => setPayLoading(false),
        },
      });
      rzp.on('payment.failed', (resp) => {
        setPayLoading(false);
        setPayError(resp?.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      setPayLoading(false);
      setPayError(err.message || 'Could not start payment. Please try again.');
    }
  };

  if (payDone) {
    return (
      <Modal title="Enrollment Successful">
        <div className="text-center py-4">
          <p className="text-sm font-semibold mb-1.5">🎉 You're enrolled in {batch ? batch.name : batchName}!</p>
          <p className="text-xs muted">Your access has been unlocked immediately — no waiting for approval.</p>
          <button onClick={closeModal} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold mt-4">Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title}>
      <p className="text-sm muted mb-4">{desc}</p>

      {/* New: automated payment, presented as the primary option */}
      <button
        onClick={payWithRazorpay}
        disabled={payLoading}
        className="w-full mb-3 flex items-center justify-center gap-2 btn-gold rounded-lg py-3 text-sm font-bold disabled:opacity-60"
      >
        {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
        {payLoading ? 'Opening payment…' : `Pay ${priceLabel(amount)} Online — Instant Access`}
      </button>
      {payError && <p className="text-xs text-red-400 mb-3">{payError}</p>}

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs muted">or pay manually via UPI</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {/* Existing manual UPI flow — UNCHANGED */}
      {mobile && (
        <a href={upiUri} className="w-full mb-4 flex items-center justify-center gap-2 border rounded-lg py-3 text-sm font-bold" style={{ borderColor: 'var(--border)' }}>
          <Smartphone className="w-4 h-4" /> Pay {priceLabel(amount)} via GPay / PhonePe / Paytm
        </a>
      )}
      <div className="flex flex-col items-center card2 rounded-xl p-4 mb-4">
        <img src={qrSrc} alt="UPI QR Code" className="w-40 h-40 max-w-full rounded-lg bg-white p-1" />
        <p className="text-xs muted mt-2 text-center">Scan with GPay / PhonePe / Paytm — Amount {priceLabel(amount)}</p>
      </div>
      <div className="flex items-center justify-between card2 rounded-lg px-3 py-2.5 mb-4">
        <div><p className="text-[10px] muted uppercase">UPI ID</p><p className="font-semibold text-sm">{upiId}</p></div>
        <button
          onClick={() => { navigator.clipboard.writeText(upiId); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          className="px-3 py-1.5 rounded-md btn-gold text-xs font-bold"
        >{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      <input type="text" placeholder="Enter UTR / Transaction Reference ID" value={utr} onChange={(e) => setUtr(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={submitPaymentRef} className="btn-gold rounded-lg py-2.5 text-sm font-bold">Submit for Approval</button>
        <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold bg-[#25D366] text-white">
          <MessageCircle className="w-4 h-4" />Send Screenshot
        </a>
      </div>
      {!user && <p className="text-xs text-amber-400 mt-3">⚠ Please login first so we can link your payment to your account.</p>}
    </Modal>
  );
}
