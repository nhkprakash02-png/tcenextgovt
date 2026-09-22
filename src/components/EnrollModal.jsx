'use client';

import React, { useState } from 'react';
import { Smartphone, MessageCircle } from 'lucide-react';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { priceLabel, isMobileDevice } from '../lib/utils';

export default function EnrollModal({ context, batchId }) {
  const { DB, saveDB, user, closeModal, openModal } = useApp();
  const [utr, setUtr] = useState('');
  const [copied, setCopied] = useState(false);

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

  return (
    <Modal title={title}>
      <p className="text-sm muted mb-4">{desc}</p>
      {mobile && (
        <a href={upiUri} className="w-full mb-4 flex items-center justify-center gap-2 btn-gold rounded-lg py-3 text-sm font-bold">
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
