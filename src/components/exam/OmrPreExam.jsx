'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import { OMR_PRE_EXAM_SECONDS, DEFAULT_ROLL_DIGITS, bookletNumber, rollNumberFromPhone } from '../../lib/omr';

const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// The 5-minute pre-exam window of an Offline / OMR Full Mock. `record` ({ setLetter, startedAt })
// is saved on this device when the student accepted the instructions, so the 5 minutes keep
// running even if they tap "Go back" and visit other pages. When the timer reaches 00:00 the exam
// starts by itself (onAutoStart) — there is no button to skip the wait.
export default function OmrPreExam({ test, user, record, onAutoStart, onGoBack }) {
  useLockBodyScroll(true);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, OMR_PRE_EXAM_SECONDS - Math.floor((now - record.startedAt) / 1000));
  const progress = Math.min(100, ((OMR_PRE_EXAM_SECONDS - remaining) / OMR_PRE_EXAM_SECONDS) * 100);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      onAutoStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const digits = test.omrRollDigits || DEFAULT_ROLL_DIGITS;
  const roll = rollNumberFromPhone(user.phone, digits);
  const booklet = bookletNumber(test.id, record.setLetter);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop">
      <div className="card glow-border rounded-2xl p-6 w-full max-w-md max-h-[92vh] overflow-y-auto">
        <h3 className="font-display font-700 text-lg mb-1">Offline / OMR Exam</h3>
        <p className="text-xs muted mb-4">{test.title} — pre-exam window</p>

        <div className="card2 rounded-xl p-4 mb-4 text-center">
          <p className="text-[11px] font-bold muted uppercase flex items-center justify-center gap-1.5"><Clock className="w-3.5 h-3.5" />Exam starts automatically in</p>
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
              <p className="font-display font-800 text-3xl gold-text">{record.setLetter}</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold muted uppercase">Booklet No.</p>
              <p className="font-display font-800 text-2xl gold-text tracking-wider">{booklet}</p>
            </div>
          </div>
          {!roll && <p className="text-[11px] text-red-400">No phone number found on your profile, so a roll number can't be shown. Please tell your faculty.</p>}
        </div>

        <ul className="text-xs muted space-y-1.5 mb-4 list-disc pl-4">
          <li>Collect the question booklet marked <b>Set {record.setLetter}</b> (Booklet No. {booklet}) and your OMR sheet from your faculty.</li>
          <li>Fill your name, roll number, set and booklet number on the OMR sheet exactly as shown above.</li>
          <li>Do not open the question booklet until the exam starts.</li>
          <li>The exam starts on its own when the timer reaches 00:00. You may go back and visit other pages meanwhile — the timer keeps running and the exam will open automatically.</li>
        </ul>

        <button onClick={onGoBack} className="w-full btn-ghost rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Go back (the timer keeps running)
        </button>
      </div>
    </div>
  );
}
