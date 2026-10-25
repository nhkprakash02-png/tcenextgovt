'use client';

import React, { useEffect, useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { OMR_PRE_EXAM_SECONDS, DEFAULT_ROLL_DIGITS, bookletNumber, pickRandomSetLetter, rollNumberFromPhone } from '../../lib/omr';

const STALE_MS = 3 * 60 * 60 * 1000; // a saved pre-exam record older than 3 hours belongs to an old attempt

const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// Unskippable 5-minute window shown before an Offline / OMR Full Mock. It shows the student the
// details to write on their OMR sheet (name, roll number, set, booklet number) and assigns a
// random set. The start time is saved on this device, so closing the window or refreshing the
// page never restarts or shortens the 5 minutes.
export default function OmrPreExam({ test, user, onProceed, onCancel }) {
  useLockBodyScroll(true);
  const storageKey = `tce_omr_pre_${user.id}_${test.id}`;

  const [rec] = useState(() => {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (e) { r = null; }
    if (!r || r.proceeded || !r.setLetter || !r.startedAt || Date.now() - r.startedAt > STALE_MS) {
      r = { setLetter: pickRandomSetLetter(), startedAt: Date.now(), proceeded: false };
      try { localStorage.setItem(storageKey, JSON.stringify(r)); } catch (e) { /* private mode: timer still works while open */ }
    }
    return r;
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, OMR_PRE_EXAM_SECONDS - Math.floor((now - rec.startedAt) / 1000));
  const ready = remaining === 0;
  const progress = Math.min(100, ((OMR_PRE_EXAM_SECONDS - remaining) / OMR_PRE_EXAM_SECONDS) * 100);

  const digits = test.omrRollDigits || DEFAULT_ROLL_DIGITS;
  const roll = rollNumberFromPhone(user.phone, digits);
  const booklet = bookletNumber(test.id, rec.setLetter);

  const proceed = () => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ ...rec, proceeded: true })); } catch (e) { /* ignore */ }
    onProceed(rec.setLetter);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop">
      <div className="card glow-border rounded-2xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto">
        <h3 className="font-display font-700 text-lg mb-1">Offline / OMR Exam</h3>
        <p className="text-xs muted mb-4">{test.title} — pre-exam window</p>

        <div className="card2 rounded-xl p-4 mb-4 text-center">
          <p className="text-[11px] font-bold muted uppercase flex items-center justify-center gap-1.5"><Clock className="w-3.5 h-3.5" />Exam unlocks in</p>
          <p className="font-display font-800 text-4xl gold-text my-1">{fmt(remaining)}</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full gold-grad" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="card2 rounded-xl p-4 mb-4 text-sm space-y-2">
          <p className="text-[11px] font-bold muted uppercase">Write these on your OMR sheet</p>
          <p><b>Student Name:</b> {user.name}</p>
          <p><b>Roll Number:</b> <span className="font-display font-700 tracking-widest">{roll || '—'}</span> <span className="text-[11px] muted">({digits}-digit, from your registered phone number)</span></p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg p-3 text-center" style={{ border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold muted uppercase">Your Set</p>
              <p className="font-display font-800 text-3xl gold-text">{rec.setLetter}</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold muted uppercase">Booklet No.</p>
              <p className="font-display font-800 text-2xl gold-text tracking-wider">{booklet}</p>
            </div>
          </div>
          {!roll && <p className="text-[11px] text-red-400">No phone number found on your profile, so a roll number can't be shown. Please tell your faculty.</p>}
        </div>

        <ul className="text-xs muted space-y-1.5 mb-4 list-disc pl-4">
          <li>Collect the question booklet marked <b>Set {rec.setLetter}</b> (Booklet No. {booklet}) and your OMR sheet from your faculty.</li>
          <li>Fill your name, roll number, set and booklet number on the OMR sheet exactly as shown above.</li>
          <li>Do not open the question booklet until the exam starts.</li>
          <li>When the exam starts, mark your answers on the OMR sheet and tick the same answers here on the website.</li>
          <li>This window cannot be skipped — the button below unlocks when the timer reaches 00:00.</li>
        </ul>

        <button
          onClick={proceed} disabled={!ready}
          className="w-full btn-gold rounded-lg py-3 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {ready ? 'Continue to Exam Instructions' : `Please wait ${fmt(remaining)}`}
        </button>
        <button onClick={onCancel} className="w-full mt-2 text-xs muted flex items-center justify-center gap-1 py-1.5">
          <ArrowLeft className="w-3 h-3" /> Go back (the timer keeps running)
        </button>
      </div>
    </div>
  );
}
