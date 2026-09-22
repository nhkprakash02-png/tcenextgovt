'use client';

import React from 'react';
import Modal from '../Modal';

export default function AttemptSelector({ submissions, onPick, onClose }) {
  if (submissions.length === 1) { onPick(submissions[0]); return null; }
  return (
    <Modal title="Select an Attempt to Analyze" onClose={onClose}>
      <div className="space-y-2">
        {submissions.map((s) => (
          <button key={s.id} onClick={() => onPick(s)} className="w-full text-left card2 rounded-lg px-4 py-3 flex items-center justify-between gap-3 hover:ring-1 hover:ring-amber-500">
            <div><p className="text-sm font-semibold">Attempt {s.attempt}</p><p className="text-[11px] muted">{new Date(s.date).toLocaleString()} • Accuracy {s.accuracy}%</p></div>
            <span className="gold-text font-bold text-sm shrink-0">{s.score}/{s.maxScore}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
