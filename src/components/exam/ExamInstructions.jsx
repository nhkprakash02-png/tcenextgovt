'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Play } from 'lucide-react';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';

export default function ExamInstructions({ test, user, resumeData, onBegin, onResume, onCancel }) {
  const [lang, setLang] = useState('en');
  useLockBodyScroll(true);
  const [agreed, setAgreed] = useState(false);
  const hasResume = resumeData && resumeData.testId === test.id && resumeData.remaining > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop">
      <div className="card glow-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-700 text-lg">Exam Instructions</h3>
          <button onClick={onCancel} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="card2 rounded-xl p-4 mb-4 text-sm space-y-2">
          <p><b>Test:</b> {test.title}</p>
          <p><b>Candidate:</b> {user.name}{user.phone ? ` | ${user.phone}` : ''}</p>
          <p><b>Total Questions:</b> {test.questions.length}</p>
          <p><b>Duration:</b> {test.durationMin} minutes</p>
          <p><b>Total Marks:</b> {+(test.questions.length * test.marksCorrect).toFixed(2)}</p>
          <p><b>Marking Scheme:</b> <span className="text-emerald-400">+{test.marksCorrect}</span> for correct, <span className="text-red-400">-{test.marksWrong}</span> for wrong</p>
        </div>
        <ul className="text-xs muted space-y-1.5 mb-4 list-disc pl-4">
          <li>The exam will open in full-screen mode for an authentic CBT experience.</li>
          <li>Switching tabs or exiting full-screen will trigger a warning; 3 violations auto-submit your test.</li>
          <li>Use "Save & Next", "Mark for Review & Next" and "Clear Response" to navigate.</li>
          <li>Your answers auto-save — you can resume if your browser refreshes or disconnects.</li>
          <li>The timer starts the instant you begin and cannot be paused.</li>
        </ul>
        <div className="mb-4">
          <label className="text-xs font-bold muted uppercase block mb-1.5">Choose your default language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm">
            <option value="en">English</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>
        <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 mt-0.5 accent-amber-500 shrink-0" />
          <span className="text-xs muted">I have understood and agree to all the instructions.</span>
        </label>
        {hasResume ? (
          <>
            <button disabled={!agreed} onClick={() => onResume(resumeData)} className="w-full btn-gold rounded-lg py-3 text-sm font-bold mb-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <RotateCcw className="w-4 h-4" />Resume Previous Attempt
            </button>
            <button disabled={!agreed} onClick={() => onBegin(lang)} className="w-full btn-ghost rounded-lg py-2.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">Start Fresh Instead (discards saved progress)</button>
          </>
        ) : (
          <button disabled={!agreed} onClick={() => onBegin(lang)} className="w-full btn-gold rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <Play className="w-4 h-4" />I am ready to begin
          </button>
        )}
      </div>
    </div>
  );
}
