'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Languages, Maximize, Menu, X } from 'lucide-react';
import { useExam } from '../../hooks/useExam';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';

const PALETTE_COLORS = {
  'not-visited': 'bg-gray-500 text-white',
  'not-answered': 'bg-red-500 text-white',
  answered: 'bg-emerald-500 text-ink',
  marked: 'bg-purple-500 text-white',
  'answered-marked': 'bg-purple-500 text-white',
};

// Swipe navigation is intentionally mobile/tablet PORTRAIT only — checked fresh at the moment
// of each touch (not cached in state), so it correctly turns itself off if the device is
// rotated to landscape or the exam is opened on a desktop-sized window.
const SWIPE_MAX_WIDTH = 1024; // matches the existing lg: breakpoint used for the desktop palette layout
const SWIPE_MIN_DISTANCE = 60; // px
function isMobilePortraitViewport() {
  return window.innerWidth < SWIPE_MAX_WIDTH && window.innerHeight > window.innerWidth;
}

function fmtTimer(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

export default function ExamRunner({ initialExam, user, onFinish }) {
  const { exam: st, goToQuestion, examNav, handleOptionClick, clearResponse, markForReview, saveAndNext, toggleLang, finish } = useExam(initialExam, user.id, onFinish);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const touchRef = useRef(null);
  useLockBodyScroll(true);

  const q = st.questions[st.current];
  const qOptions = Array.isArray(q?.options) ? q.options : []; // never let a malformed question crash the render
  const hasBn = st.questions.some((qq) => qq.textBn && qq.textBn.trim().length > 0);
  const label = (opt) => (st.lang === 'bn' && opt.textBn) ? opt.textBn : opt.textEn;

  // Reaching "Save & Next" on the LAST question now opens the same full submit-confirmation
  // popup (with the answered/marked/not-visited breakdown) as the manual "Submit Test" button,
  // instead of a separate simpler prompt — one consistent confirmation experience either way.
  const handleSaveAndNext = () => { if (saveAndNext()) { setPaletteOpen(false); setConfirmSubmit(true); } };

  // Tapping "Submit Test" while the mobile/tablet palette panel is open closes that panel at
  // the same moment the confirmation popup opens, so the popup is never left hidden behind it.
  const handleSubmitTestTap = () => { setPaletteOpen(false); setConfirmSubmit(true); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const onTouchStart = (e) => {
    if (!isMobilePortraitViewport()) { touchRef.current = null; return; }
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchRef.current || !isMobilePortraitViewport()) { touchRef.current = null; return; }
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    // Require a clearly horizontal swipe so normal vertical scrolling never gets mistaken for one.
    if (Math.abs(dx) >= SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) examNav(1); // swipe left -> next question
      else examNav(-1); // swipe right -> previous question
    }
  };

  const answered = st.status.filter((s) => s === 'answered' || s === 'answered-marked').length;
  const notAnswered = st.status.filter((s) => s === 'not-answered').length;
  const marked = st.status.filter((s) => s === 'marked' || s === 'answered-marked').length;
  const notVisited = st.status.filter((s) => s === 'not-visited').length;

  // Guards against the device/browser Back button silently yanking the exam screen away
  // mid-test (previously: pressing Back changed the app's tab state, which unmounted this
  // whole component with no warning and no chance to save/confirm). The standard SPA technique
  // for this: push one extra "guard" history entry the moment the exam starts. The first Back
  // press then just pops that guard entry (firing popstate here) instead of actually navigating
  // away — we immediately push another guard entry to neutralize it, and show the exact same
  // submit-confirmation popup used everywhere else, instead of a separate dialog.
  //
  // NEXT.JS NOTE: the guard entry is now pushed with the CURRENT url passed explicitly rather
  // than omitted. Next's App Router patches history.pushState so it can keep its own router
  // state in sync; passing the same URL makes the guard entry a true no-op navigation for the
  // router (it re-resolves to the route already on screen), so the exam screen is never torn
  // down. The user-facing behaviour is identical to before: first Back press pops the guard,
  // we immediately re-push it and show the normal submit-confirmation popup.
  useEffect(() => {
    const currentUrl = window.location.href;
    window.history.pushState({ examGuard: true }, '', currentUrl);
    const onPopState = () => {
      window.history.pushState({ examGuard: true }, '', window.location.href);
      setConfirmSubmit(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between px-4 py-3 card2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          {logoError ? (
            <div className="w-8 h-8 rounded-full gold-grad flex items-center justify-center font-display font-800 text-ink text-sm">T</div>
          ) : (
            <img src="/logo.png" alt="TCE" onError={() => setLogoError(true)} className="w-8 h-8 rounded-full object-cover" />
          )}
          <div><p className="text-xs font-semibold">TCE — {st.title}</p><p className="text-[10px] muted">Candidate: {user.name}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {hasBn && (
            <button onClick={toggleLang} className="btn-ghost rounded-md px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1">
              <Languages className="w-3.5 h-3.5" />{st.lang === 'en' ? 'EN' : 'BN'}
            </button>
          )}
          <div className="px-3 py-1.5 rounded-md bg-red-500/15 text-red-400 font-mono font-bold text-sm">{fmtTimer(st.remaining)}</div>
          <button onClick={toggleFullscreen} className="btn-ghost rounded-md px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1"><Maximize className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {!logoError && (
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute inset-0 m-auto w-2/5 max-w-[380px] aspect-square rounded-full overflow-hidden opacity-[0.06] z-0"
            >
              <img src="/logo.png" alt="" onError={() => setLogoError(true)} className="w-full h-full object-cover" />
            </div>
          )}
          {logoError && (
            <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0">
              <span className="font-display font-800 text-9xl tracking-widest opacity-[0.045]">TCE</span>
            </div>
          )}
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs muted">Question <span className="gold-text font-bold">{st.current + 1}</span> of {st.questions.length}</span>
              <span className="text-xs muted">Marks: <span className="text-emerald-400 font-semibold">+{st.marksCorrect}</span> / <span className="text-red-400 font-semibold">-{st.marksWrong}</span></span>
            </div>
            <p className={`text-base sm:text-lg font-medium mb-6 leading-relaxed ${(st.lang === 'bn' && q.textBn) ? 'bn' : ''}`}>
              {(st.lang === 'bn' && q.textBn) ? q.textBn : (q.textEn || 'This question could not be loaded.')}
            </p>
            <div className="space-y-3">
              {qOptions.length ? qOptions.map((o) => {
                const checked = st.answers[st.current] === o.key;
                return (
                  <label key={o.key} className={`flex items-center gap-3 card rounded-xl px-4 py-3 cursor-pointer ${checked ? 'ring-2 ring-amber-500' : ''}`}>
                    <input type="radio" name="examOpt" checked={checked} onChange={() => {}} onClick={() => handleOptionClick(o.key)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm font-semibold gold-text">{o.key}.</span>
                    <span className={`text-sm ${(st.lang === 'bn' && o.textBn) ? 'bn' : ''}`}>{label(o)}</span>
                  </label>
                );
              })
              : <p className="muted text-sm">No answer options are available for this question — please skip it and let us know via WhatsApp.</p>}
            </div>
          </div>
        </div>

        {paletteOpen && <div onClick={() => setPaletteOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 z-[78]" />}

        <div className={`w-full lg:w-72 shrink-0 card2 fixed lg:relative inset-y-0 right-0 z-[79] lg:z-auto transition-transform duration-300 ease-out flex flex-col ${paletteOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`} style={{ borderLeft: '1px solid var(--border)', maxWidth: '85vw' }}>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="flex items-center justify-between mb-3 lg:hidden">
              <p className="text-xs font-bold muted uppercase">Question Palette</p>
              <button onClick={() => setPaletteOpen(false)} className="w-7 h-7 rounded-full btn-ghost flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs font-bold muted uppercase mb-3 hidden lg:block">Question Palette</p>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {st.questions.map((_, i) => (
                <button key={i} onClick={() => { goToQuestion(i); setPaletteOpen(false); }} className={`palette-btn ${PALETTE_COLORS[st.status[i]]} ${st.current === i ? 'ring-2 ring-white' : ''}`}>
                  {i + 1}{st.status[i] === 'answered-marked' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Not Answered</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-500 inline-block" />Not Visited</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-500 inline-block" />Marked for Review</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-purple-500 inline-block relative">•</span>Answered &amp; Marked</div>
            </div>
          </div>
          <div className="shrink-0 p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={handleSubmitTestTap} className="w-full rounded-lg py-2.5 text-xs font-bold bg-red-600 text-white">Submit Test</button>
          </div>
        </div>

        <button onClick={() => setPaletteOpen(true)} className="lg:hidden fixed bottom-24 right-4 z-[77] w-12 h-12 rounded-full btn-gold shadow-lg flex items-center justify-center" title="Question Palette">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-between px-4 py-3 card2" style={{ borderTop: '1px solid var(--border)' }}>
        <button onClick={() => examNav(-1)} className="btn-ghost rounded-lg px-4 py-2 text-xs font-bold">Previous</button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={clearResponse} className="btn-ghost rounded-lg px-4 py-2 text-xs font-bold">Clear Response</button>
          <button onClick={markForReview} className="rounded-lg px-4 py-2 text-xs font-bold bg-purple-600 text-white">Mark for Review &amp; Next</button>
          <button onClick={handleSaveAndNext} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">Save &amp; Next</button>
        </div>
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-[60] modal-backdrop flex items-center justify-center p-4">
          <div className="card glow-border rounded-2xl p-6 max-w-sm">
            <h3 className="font-display font-700 text-lg mb-4 text-center">Submit Test?</h3>
            <div className="grid grid-cols-2 gap-3 mb-5 text-center text-xs">
              <div className="card2 rounded-lg p-3"><p className="text-emerald-400 font-bold text-lg">{answered}</p><p className="muted">Answered</p></div>
              <div className="card2 rounded-lg p-3"><p className="text-red-400 font-bold text-lg">{notAnswered}</p><p className="muted">Not Answered</p></div>
              <div className="card2 rounded-lg p-3"><p className="text-purple-400 font-bold text-lg">{marked}</p><p className="muted">Marked for Review</p></div>
              <div className="card2 rounded-lg p-3"><p className="text-gray-400 font-bold text-lg">{notVisited}</p><p className="muted">Not Visited</p></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmSubmit(false)} className="flex-1 btn-ghost rounded-lg py-2.5 text-xs font-bold">Continue Exam</button>
              <button onClick={() => finish(false, false)} className="flex-1 rounded-lg py-2.5 text-xs font-bold bg-red-600 text-white">Yes, I want to submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
