'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Menu, X, Zap, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sectionDisplayName, classifySpeed, computeCommunityAccuracy, fmtReviewTime, liveSubmissionTitle } from '../../lib/examEngine';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';

const SPEED_ICONS = { zap: Zap, 'check-circle': CheckCircle, clock: Clock, 'alert-circle': AlertCircle };

export default function ReviewScreen({ submission: sub, onBackToSummary, onClose }) {
  const { DB } = useApp();
  const [current, setCurrent] = useState(0);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'paper'
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reattemptMode, setReattemptMode] = useState(false);
  const [localAnswers, setLocalAnswers] = useState({});
  const [showSolution, setShowSolution] = useState(false);
  useLockBodyScroll(true);
  const displayTitle = liveSubmissionTitle(DB, sub);

  const correctCount = sub.detail.filter((d) => d.given && d.given === d.q.correct).length;
  const incorrectCount = sub.detail.filter((d) => d.given && d.given !== d.q.correct).length;
  const unattemptedCount = sub.detail.filter((d) => !d.given).length;

  const goTo = (idx) => {
    setCurrent(Math.max(0, Math.min(idx, sub.detail.length - 1)));
    setViewMode('single'); setShowSolution(false); setPaletteOpen(false);
  };

  const d = sub.detail[current];
  const q = d.q;
  const attempted = !!d.given;
  const isCorrect = attempted && d.given === q.correct;
  const statusLabel = !attempted ? 'Skipped' : (isCorrect ? 'Correct' : 'Incorrect');
  const statusColor = !attempted ? 'bg-gray-500' : (isCorrect ? 'bg-emerald-500' : 'bg-red-500');
  const expectedPerQ = sub.durationSec ? sub.durationSec / sub.detail.length : 60;
  const speed = classifySpeed(d.timeSpent || 0, expectedPerQ, isCorrect, attempted);
  const communityPct = useMemo(() => computeCommunityAccuracy(DB.submissions, sub.testId, q.id, DB.students), [DB.submissions, sub.testId, q.id, DB.students]);
  const marksCorrectPerQ = +((sub.maxScore || 0) / (sub.detail.length || 1)).toFixed(2);
  const localSel = localAnswers[current];
  const SpeedIcon = speed ? SPEED_ICONS[speed.icon] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-4 py-3 gold-grad">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center shrink-0"><ArrowLeft className="w-4 h-4 text-black" /></button>
          <div className="min-w-0"><p className="text-xs font-bold text-black">Tests</p><p className="text-[11px] text-black/70 truncate">TCE — {displayTitle}</p></div>
        </div>
        <button onClick={onBackToSummary} className="text-[11px] font-bold text-black shrink-0">ANALYTICS</button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {viewMode === 'paper' ? (
            <div className="max-w-2xl mx-auto">
              <h3 className="font-display font-700 text-lg mb-4">{displayTitle} — Full Question Paper</h3>
              <div className="space-y-5">
                {sub.detail.map((dd, i) => (
                  <div key={i} className="card2 rounded-xl p-4">
                    <p className="text-sm font-medium mb-2">{i + 1}. {dd.q.textEn}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(Array.isArray(dd.q.options) ? dd.q.options : []).map((o) => <div key={o.key} className="text-xs px-3 py-1.5 rounded-md card">{o.key}. {o.textEn}</div>)}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setViewMode('single')} className="btn-gold rounded-lg px-5 py-2.5 text-xs font-bold mt-6">Back to Review</button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-sm font-bold">{current + 1}</span>
                <span className={`badge text-white ${statusColor}`}>{statusLabel}</span>
                {speed && SpeedIcon && <span className={`text-xs flex items-center gap-1 ${speed.color}`}><SpeedIcon className="w-3.5 h-3.5" />{speed.label}</span>}
                <span className="text-xs muted">You: {fmtReviewTime(d.timeSpent)} &nbsp;Avg: {fmtReviewTime(expectedPerQ)}</span>
                <span className="text-xs muted">Marks: <b className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{isCorrect ? '+' + marksCorrectPerQ : '0'}</b></span>
                {communityPct !== null && <span className="badge bg-emerald-500/20 text-emerald-400 ml-auto">{communityPct}% answered correctly</span>}
              </div>
              <p className="text-base sm:text-lg font-medium mb-6 leading-relaxed">{q.textEn} {q.textBn && <span className="bn block text-sm muted mt-1">{q.textBn}</span>}</p>
              <div className="space-y-3 mb-5">
                {(Array.isArray(q.options) ? q.options : []).map((o) => {
                  let cls = 'card';
                  if (reattemptMode) {
                    if (localSel === o.key) cls = (localSel === q.correct) ? 'card ring-2 ring-emerald-500' : 'card ring-2 ring-red-500';
                  } else if (o.key === q.correct) cls = 'bg-emerald-500/15 ring-1 ring-emerald-500';
                  else if (o.key === d.given) cls = 'bg-red-500/15 ring-1 ring-red-500';
                  return (
                    <label key={o.key} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${cls} ${reattemptMode ? 'cursor-pointer' : ''}`}>
                      <input type="radio" name="reviewOpt" disabled={!reattemptMode} checked={localSel === o.key} onChange={() => setLocalAnswers((p) => ({ ...p, [current]: o.key }))} className="w-4 h-4 accent-amber-500" />
                      <span className="text-sm font-semibold gold-text">{o.key}.</span><span className="text-sm">{o.textEn}</span>
                    </label>
                  );
                })}
              </div>
              {reattemptMode && <p className="text-[11px] muted mb-4">Re-attempt mode is for practice only — your original score is unaffected.</p>}
              <button onClick={() => setShowSolution((v) => !v)} className="btn-ghost rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5 mb-3">
                <Eye className="w-3.5 h-3.5" />{showSolution ? 'Hide Solution' : 'View Solution'} <span className="muted font-normal">— Click here to see the answer now</span>
              </button>
              {showSolution && (
                <div className="card2 rounded-xl p-4 text-sm muted">
                  <p className="mb-1"><b className="text-emerald-400">Correct Answer:</b> {q.correct}. {((Array.isArray(q.options) ? q.options : []).find((o) => o.key === q.correct) || {}).textEn || ''}</p>
                  <p>{q.explanation || 'No explanation provided for this question.'}</p>
                  {q.solutionImg && <img src={q.solutionImg} className="mt-2 rounded-lg max-h-52" alt="Solution" />}
                </div>
              )}
            </div>
          )}
        </div>

        {paletteOpen && <div onClick={() => setPaletteOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 z-[78]" />}
        <div className={`w-full lg:w-80 shrink-0 card2 p-4 overflow-y-auto fixed lg:relative inset-y-0 right-0 z-[79] lg:z-auto transition-transform duration-300 ease-out ${paletteOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`} style={{ borderLeft: '1px solid var(--border)', maxWidth: '90vw' }}>
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <p className="text-xs font-bold muted uppercase">Details</p>
            <button onClick={() => setPaletteOpen(false)} className="w-7 h-7 rounded-full btn-ghost flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-full gold-grad flex items-center justify-center text-ink text-xs font-bold shrink-0">{(sub.studentName || '?')[0]}</div>
            <p className="text-sm font-semibold truncate">{sub.studentName}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <div className="card rounded-lg p-2 flex items-center justify-between"><span className="text-emerald-400 font-bold">{correctCount}</span><span className="muted">Correct</span></div>
            <div className="card rounded-lg p-2 flex items-center justify-between"><span className="text-red-400 font-bold">{incorrectCount}</span><span className="muted">Incorrect</span></div>
            <div className="card rounded-lg p-2 flex items-center justify-between"><span className="muted font-bold">{unattemptedCount}</span><span className="muted">Unattempted</span></div>
            <div className="card rounded-lg p-2 flex items-center justify-between"><span className="text-amber-400 font-bold">0</span><span className="muted">Partial</span></div>
          </div>
          <p className="text-xs font-bold muted uppercase mb-2">Speed Indicators</p>
          <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
            <div className="card rounded-lg p-2"><Zap className="w-4 h-4 text-emerald-400 mx-auto mb-1" /><p className="text-[9px] muted leading-tight">Superfast</p></div>
            <div className="card rounded-lg p-2"><CheckCircle className="w-4 h-4 text-sky-400 mx-auto mb-1" /><p className="text-[9px] muted leading-tight">On Time</p></div>
            <div className="card rounded-lg p-2"><Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" /><p className="text-[9px] muted leading-tight">Slow</p></div>
            <div className="card rounded-lg p-2"><AlertCircle className="w-4 h-4 text-red-400 mx-auto mb-1" /><p className="text-[9px] muted leading-tight">Not Correct</p></div>
          </div>
          <p className="text-xs font-bold muted uppercase mb-2">Section: {sectionDisplayName(sub.subject)}</p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {sub.detail.map((dd, i) => {
              const att = !!dd.given;
              const corr = att && dd.given === dd.q.correct;
              const cls = !att ? 'bg-gray-500 text-white' : (corr ? 'bg-emerald-500 text-ink' : 'bg-red-500 text-white');
              return <button key={i} onClick={() => goTo(i)} className={`palette-btn ${cls} ${current === i && viewMode === 'single' ? 'ring-2 ring-white' : ''}`}>{i + 1}</button>;
            })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setViewMode('paper'); setPaletteOpen(false); }} className="btn-ghost rounded-lg py-2 text-[11px] font-bold">Question Paper</button>
            <button onClick={onBackToSummary} className="btn-ghost rounded-lg py-2 text-[11px] font-bold">Summary</button>
          </div>
        </div>

        <button onClick={() => setPaletteOpen(true)} className="lg:hidden fixed bottom-24 right-4 z-[77] w-12 h-12 rounded-full btn-gold shadow-lg flex items-center justify-center" title="Details & Question Palette">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-3 card2 gap-3 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => goTo(current - 1)} className="btn-ghost rounded-lg px-4 py-2 text-xs font-bold">Previous</button>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" onClick={() => { setReattemptMode((v) => !v); setLocalAnswers({}); }}>
          Re-attempt Questions
          <span className={`w-11 h-6 rounded-full relative transition-colors inline-block ${reattemptMode ? 'bg-amber-500' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${reattemptMode ? 'right-0.5' : 'left-0.5'}`} />
          </span>
        </label>
        <button onClick={() => goTo(current + 1)} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">Next</button>
      </div>
    </div>
  );
}
