'use client';

import React, { useState } from 'react';
import { Zap, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { shuffle, quizDurationMinutes, normalizeQuestion } from '../lib/examEngine';
import Modal from '../components/Modal';
import ExamFlow from '../components/exam/ExamFlow';

const PRESETS = [5, 10, 15, 20];
const MAX_CUSTOM = 100;

function QuizPickerModal({ onClose, onPick }) {
  const [custom, setCustom] = useState('');

  const submitCustom = () => {
    const n = parseInt(custom, 10);
    if (!n || n < 1) { alert('Please enter a valid number of questions.'); return; }
    if (n > MAX_CUSTOM) { alert(`Please choose ${MAX_CUSTOM} questions or fewer.`); return; }
    onPick(n);
  };

  return (
    <Modal title="How many questions?" onClose={onClose}>
      <p className="text-xs muted mb-4">Pick a quick preset, or enter your own number below. Duration is set automatically (~30 seconds per question).</p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {PRESETS.map((n) => (
          <button key={n} onClick={() => onPick(n)} className="card2 rounded-xl py-4 text-center hover:ring-1 hover:ring-amber-500">
            <p className="font-display font-800 text-xl gold-text">{n}</p>
            <p className="text-[10px] muted mt-0.5">{quizDurationMinutes(n)} min</p>
          </button>
        ))}
      </div>
      <div className="text-center text-xs muted mb-3">— or enter a custom number —</div>
      <div className="flex gap-2">
        <input
          type="number" min="1" max={MAX_CUSTOM} placeholder="e.g. 25" value={custom}
          onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm"
        />
        <button onClick={submitCustom} className="btn-gold rounded-lg px-5 py-2.5 text-sm font-bold">Start</button>
      </div>
    </Modal>
  );
}

// A question is only usable if it has real question text and at least 2 non-empty options
// AFTER normalization — this repairs common alternate upload shapes (plain-string options,
// options missing a `key`, etc.) rather than just rejecting anything that isn't already in
// the exact expected shape, which is what was incorrectly discarding valid questions before.
function isUsableQuestion(q) {
  return !!(q && q.textEn && q.options.length >= 2);
}

export default function Quiz() {
  const { DB, user, openModal } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { test, source: 'quiz' }

  const startQuiz = (qCount) => {
    setPickerOpen(false);
    if (!user) { alert('Please login to start the quiz.'); openModal('login'); return; }
    const gkOnly = DB.quizPool.filter((q) => q.subject === 'gk').map(normalizeQuestion).filter(isUsableQuestion);
    if (!gkOnly.length) { alert('No usable GK questions are available yet. Please check back soon.'); return; }
    const pool = shuffle(gkOnly).slice(0, Math.min(qCount, gkOnly.length));
    const mins = quizDurationMinutes(pool.length);
    const test = {
      id: 'quiz_' + pool.length, title: `Quick Quiz — GK — ${pool.length} Questions`,
      durationMin: mins, marksCorrect: 1, marksWrong: 0.25, questions: pool,
    };
    setActiveSession({ test, source: 'quiz' });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-800 text-2xl mb-1">Dynamic <span className="gold-text">Quick Quiz</span></h2>
        <p className="muted text-sm">General Knowledge &amp; Current Affairs only — questions are pulled randomly from the GK question bank.</p>
      </div>

      <div className="card glow-border rounded-2xl p-10 sm:p-16 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full gold-grad flex items-center justify-center mx-auto mb-5">
          <Zap className="w-7 h-7 text-ink" />
        </div>
        <h3 className="font-display font-700 text-lg mb-2">Ready for a quick GK quiz?</h3>
        <p className="text-xs muted mb-6">Choose how many questions you want, and we'll set a fair timer automatically.</p>
        <span className="badge bg-emerald-500/20 text-emerald-400 inline-block mb-6">✅ 100% Free — Open for All Visitors</span>
        <button onClick={() => setPickerOpen(true)} className="btn-gold rounded-lg px-8 py-3 text-sm font-bold flex items-center gap-2 mx-auto">
          <Play className="w-4 h-4" />Start Quiz
        </button>
      </div>

      {pickerOpen && <QuizPickerModal onClose={() => setPickerOpen(false)} onPick={startQuiz} />}

      {activeSession && (
        <ExamFlow test={activeSession.test} source={activeSession.source} onClose={() => setActiveSession(null)} />
      )}
    </div>
  );
}
