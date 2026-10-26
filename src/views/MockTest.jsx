'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Repeat, BarChart2, Lock, Play, MoreVertical, Link2, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUBCATEGORIES } from '../lib/utils';
import { testDeepLinkPath } from '../lib/routes';
import ExamFlow from '../components/exam/ExamFlow';
import AttemptSelector from '../components/exam/AttemptSelector';
import ResultScreen from '../components/exam/ResultScreen';
import ReviewScreen from '../components/exam/ReviewScreen';
import { loadResumeData, clearExamProgress } from '../lib/examEngine';
import { OMR_SUBJECT, OMR_SET_LETTERS, buildOmrExamTest, pickRandomSetLetter } from '../lib/omr';
import { loadPre, clearPre, findPendingOmrAction } from '../lib/omrSession';

const SUBJECTS = [['math', 'Math'], ['english', 'English'], ['reasoning', 'Reasoning'], ['gk', 'GK'], ['science', 'Science'], ['full', 'Regular Online Full Mock'], ['omr', 'Offline / OMR Full Mock']];

// Mirrors: userAdmin || isFree || (adminUnlocked && userEnrolled).
function canAccessMock(mock, isEnrolled, admin) {
  const isFree = mock.isDemo === true || mock.price === 0;
  const adminUnlocked = mock.adminUnlocked === true;
  return !!(admin || isFree || (adminUnlocked && isEnrolled()));
}

function findTestAnySubject(DB, testId) {
  for (const subj of Object.keys(DB.mockTests)) {
    const t = (DB.mockTests[subj] || []).find((x) => x.id === testId);
    if (t) return { test: t, subject: subj };
  }
  return null;
}

function TestCardSkeleton() {
  return (
    <div className="card glow-border rounded-2xl p-5 animate-pulse">
      <div className="h-4 w-20 rounded bg-white/10 mb-3" />
      <div className="h-4 w-2/3 rounded bg-white/10 mb-2" />
      <div className="h-3 w-1/2 rounded bg-white/10 mb-6" />
      <div className="h-9 w-full rounded-lg bg-white/10" />
    </div>
  );
}

export default function MockTest() {
  const { DB, dbLoading, user, hasFullAccess, isEnrolled, openModal, deepLinkTestId, consumeDeepLinkTestId, examInProgress } = useApp();
  const [subjectTab, setSubjectTab] = useState('math');
  const [searchQ, setSearchQ] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [subCategory, setSubCategory] = useState('all');
  const [shareMenuId, setShareMenuId] = useState(null); // testId whose share menu is open, or null

  const [activeSession, setActiveSession] = useState(null); // { test, source, subject }
  const [attemptPicker, setAttemptPicker] = useState(null); // array of submissions
  const [standaloneResult, setStandaloneResult] = useState(null); // submission shown outside ExamFlow
  const [standaloneReview, setStandaloneReview] = useState(false);
  const [deepLinkNotFound, setDeepLinkNotFound] = useState(false);

  const tests = useMemo(() => {
    let list = DB.mockTests[subjectTab] || [];
    if (searchQ.trim()) list = list.filter((t) => t.title.toLowerCase().includes(searchQ.trim().toLowerCase()));
    if (examFilter !== 'all') list = list.filter((t) => (t.examCategory || 'All Exams') === examFilter || (t.examCategory || 'All Exams') === 'All Exams');
    if (subCategory !== 'all') list = list.filter((t) => t.subCategory === subCategory);

    // Paid/Enrolled mock tests are sorted by the admin-defined `order` field (ascending; tests
    // without a numeric order fall back to the end of the paid group, in their original relative
    // order). Free demo tests are left completely untouched and always precede the paid group,
    // matching how they've always been presented ("try the free demo, then unlock the rest").
    const demoTests = list.filter((t) => t.isDemo);
    const paidTests = list.filter((t) => !t.isDemo).slice().sort((a, b) => {
      const ao = typeof a.order === 'number' ? a.order : Infinity;
      const bo = typeof b.order === 'number' ? b.order : Infinity;
      return ao - bo;
    });
    return [...demoTests, ...paidTests];
  }, [DB.mockTests, subjectTab, searchQ, examFilter, subCategory]);

  // ---- Offline / OMR Full Mock helpers ----
  const validLetter = (l) => (OMR_SET_LETTERS.includes(l) ? l : 'A');

  // Opens the exam screen for an Offline / OMR test with the given set (fixed question order).
  //   flow:   'first' (instructions -> 5-minute window -> auto-start) | 'reattempt' (same set, no window)
  //   action: 'wait' | 'autostart' | 'resume' — jump straight back into a step that was already under way
  const openOmr = (test, letter, opts) => {
    const derived = { ...buildOmrExamTest(test, validLetter(letter), user), omrFlow: (opts && opts.flow) || null };
    setActiveSession({ test: derived, source: 'mock', subject: OMR_SUBJECT, omrAction: (opts && opts.action) || null });
  };

  // An Offline / OMR exam needs attention: its 5-minute window just ended (start the exam), or an
  // exam is running but its screen was lost (app reopened / cleared from memory) — continue it.
  const launchPendingOmr = (pending) => {
    const t = (DB.mockTests[OMR_SUBJECT] || []).find((x) => x.id === pending.testId);
    if (!t) { // the test was removed meanwhile — drop the leftovers so nothing keeps retrying
      if (pending.type === 'resume') clearExamProgress(user.id); else clearPre(user.id, pending.testId);
      return;
    }
    if (pending.type === 'resume') {
      const data = loadResumeData(user.id);
      openOmr(t, data && data.omr && data.omr.set, { action: 'resume' });
    } else {
      const rec = loadPre(user.id, pending.testId);
      openOmr(t, rec && rec.setLetter, { action: 'autostart' });
    }
  };

  const startTest = (test, subject) => {
    if (!user) { alert('Please login to start the test (attempts are tracked in your dashboard).'); openModal('login'); return; }
    if ((subject || subjectTab) === OMR_SUBJECT) {
      // 1) an exam in progress / a finished 5-minute window for THIS test: carry on with it
      const pending = findPendingOmrAction(user.id);
      if (pending && pending.testId === test.id) { launchPendingOmr(pending); return; }
      // 2) the 5-minute window for this test is still counting down: show it again (same timer)
      const rec = loadPre(user.id, test.id);
      if (rec && !rec.proceeded) { openOmr(test, rec.setLetter, { action: 'wait' }); return; }
      // 3) already attempted before: re-attempt with the SAME booklet set as the first attempt, no window
      const earlier = DB.submissions
        .filter((x) => x.testId === test.id && x.studentId === user.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (earlier.length) { openOmr(test, earlier[0].omr && earlier[0].omr.set, { flow: 'reattempt' }); return; }
      // 4) first attempt: a random set (A–D) is assigned; instructions come first, then the window
      openOmr(test, pickRandomSetLetter(), { flow: 'first' });
      return;
    }
    setActiveSession({ test, source: 'mock', subject: subject || subjectTab });
  };

  // Keeps watching (while this page is open) for an Offline / OMR exam that must start or continue.
  useEffect(() => {
    if (!user || dbLoading) return undefined;
    const check = () => {
      if (activeSession || examInProgress) return;
      const pending = findPendingOmrAction(user.id);
      if (pending) launchPendingOmr(pending);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user && user.id, dbLoading, activeSession, examInProgress, DB.mockTests]);

  // Handles a /test/:id deep link: once the real data has loaded, find that test across every
  // subject, switch to its subject tab so it's visible, and — if the visitor is logged in and
  // allowed to take it — launch it directly. If they're not logged in yet, prompt login first
  // rather than silently doing nothing. Only runs once per deep link (consumeDeepLinkTestId
  // clears it), so it never re-triggers from normal navigation afterward.
  useEffect(() => {
    if (!deepLinkTestId || dbLoading) return;
    const found = findTestAnySubject(DB, deepLinkTestId);
    if (!found) { setDeepLinkNotFound(true); consumeDeepLinkTestId(); return; }
    setSubjectTab(found.subject);
    if (!user) { openModal('login'); consumeDeepLinkTestId(); return; }
    if (!canAccessMock(found.test, isEnrolled, hasFullAccess)) { openModal('enroll', { context: 'locked' }); consumeDeepLinkTestId(); return; }
    startTest(found.test, found.subject);
    consumeDeepLinkTestId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkTestId, dbLoading]);

  const openAnalysis = (testId) => {
    const subs = DB.submissions.filter((s) => s.testId === testId && user && s.studentId === user.id).sort((a, b) => b.attempt - a.attempt);
    if (!subs.length) { alert('No attempt found for this test yet.'); return; }
    setAttemptPicker(subs);
  };

  const copyTestLink = (t) => {
    const url = window.location.origin + testDeepLinkPath(t.id);
    navigator.clipboard.writeText(url).then(
      () => alert('Link copied! Paste it anywhere to send a direct link to this test.'),
      () => prompt('Copy this link:', url) // clipboard API unavailable — fall back to a manual-copy prompt
    );
    setShareMenuId(null);
  };
  const shareTestToWhatsApp = (t) => {
    const url = window.location.origin + testDeepLinkPath(t.id);
    const text = `Check out "${t.title}" on TCE - The Competitive Edge: ${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    setShareMenuId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-800 text-2xl mb-1">Mock Tests <span className="gold-text">CBT Engine</span></h2>
          <p className="muted text-sm">TCS iON / SSC CBT style — free demo mock in every subject, rest unlocked for enrolled batch students only.</p>
        </div>
        <span className="badge bg-red-500/15 text-red-400 w-fit">🔒 Paid / Enrolled Students Only (except Free Demo)</span>
      </div>

      {deepLinkNotFound && (
        <div className="mb-4 text-xs bg-amber-500/15 gold-text rounded-lg py-2.5 px-4">
          The test you followed a link to isn't available anymore — it may have been removed. Browse the current tests below instead.
        </div>
      )}

      <div className="flex flex-col md:flex-row md:flex-wrap gap-3 mb-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1 min-w-0">
          {SUBJECTS.map(([id, label]) => (
            <button key={id} onClick={() => { setSubjectTab(id); setSubCategory('all'); }} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${subjectTab === id ? 'tab-active' : 'card2 muted'}`}>{label}</button>
          ))}
        </div>
        <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} className="rounded-lg px-3 py-2 text-xs w-full md:w-auto md:shrink-0">
          <option value="all">All Exam Categories</option>
          {DB.examCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative w-full md:w-64 md:shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <input type="text" placeholder="Search test title..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="w-full rounded-lg pl-9 pr-3 py-2 text-xs" />
        </div>
      </div>

      {SUBCATEGORIES[subjectTab] && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-6">
          <button onClick={() => setSubCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${subCategory === 'all' ? 'tab-active' : 'card2 muted'}`}>All</button>
          {SUBCATEGORIES[subjectTab].map((sc) => (
            <button key={sc} onClick={() => setSubCategory(sc)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${subCategory === sc ? 'tab-active' : 'card2 muted'}`}>{sc}</button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dbLoading ? (
          Array.from({ length: 6 }).map((_, i) => <TestCardSkeleton key={i} />)
        ) : tests.length ? tests.map((t) => {
          const locked = !canAccessMock(t, isEnrolled, hasFullAccess);
          const attempts = DB.submissions.filter((s) => s.testId === t.id && user && s.studentId === user.id).length;
          return (
            <div key={t.id} className="card glow-border rounded-2xl p-5 flex flex-col relative">
              <button
                onClick={() => setShareMenuId(shareMenuId === t.id ? null : t.id)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full btn-ghost flex items-center justify-center z-10"
                title="Share this test"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {shareMenuId === t.id && (
                <>
                  <div onClick={() => setShareMenuId(null)} className="fixed inset-0 z-10" />
                  <div className="absolute top-11 right-3 z-20 card2 rounded-lg shadow-lg overflow-hidden text-xs w-44" style={{ border: '1px solid var(--border)' }}>
                    <button onClick={() => copyTestLink(t)} className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/5"><Link2 className="w-3.5 h-3.5" />Copy Link</button>
                    <button onClick={() => shareTestToWhatsApp(t)} className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/5"><MessageCircle className="w-3.5 h-3.5" />Share to WhatsApp</button>
                  </div>
                </>
              )}

              <div className="flex justify-between items-start mb-2 gap-2 flex-wrap pr-7">
                <span className={`badge ${t.isDemo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/15 gold-text'}`}>{t.isDemo ? 'FREE DEMO' : 'PREMIUM'}</span>
                {t.subCategory && <span className="badge bg-purple-500/15 text-purple-400">{t.subCategory}</span>}
                {t.examCategory && t.examCategory !== 'All Exams' && <span className="badge bg-sky-500/15 text-sky-400">{t.examCategory}</span>}
                {(t.adminUnlocked && !t.isDemo && !locked) && <span className="badge bg-sky-500/20 text-sky-400">🔓 Unlocked for Enrolled Students</span>}
                {locked && <span className="badge bg-red-500/15 text-red-400">🔒 Locked</span>}
              </div>
              <h3 className="font-display font-700 text-sm mb-1">{t.title}</h3>
              <p className="text-xs muted mb-3">{t.questions.length} Questions • {t.durationMin} min • +{t.marksCorrect}/-{t.marksWrong}</p>
              {attempts > 0 && <p className="text-[11px] muted mb-2">Attempts so far: <span className="gold-text font-semibold">{attempts}</span></p>}
              {(attempts > 0 && !locked) ? (
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button onClick={() => startTest(t)} className="btn-gold rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1"><Repeat className="w-3.5 h-3.5" />Re-attempt</button>
                  <button onClick={() => openAnalysis(t.id)} className="btn-ghost rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1"><BarChart2 className="w-3.5 h-3.5" />Analysis</button>
                </div>
              ) : (
                <button
                  onClick={() => (locked ? openModal('enroll', { context: 'locked' }) : startTest(t))}
                  className={`mt-auto rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${locked ? 'btn-ghost' : 'btn-gold'}`}
                >
                  {locked ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {locked ? 'Enroll in Batch to Unlock' : 'Start Test'}
                </button>
              )}
            </div>
          );
        }) : <p className="muted text-sm col-span-full">No tests match your search.</p>}
      </div>

      {activeSession && (
        <ExamFlow test={activeSession.test} source={activeSession.source} subject={activeSession.subject} omrAction={activeSession.omrAction} onClose={() => setActiveSession(null)} />
      )}
      {attemptPicker && (
        <AttemptSelector submissions={attemptPicker} onClose={() => setAttemptPicker(null)} onPick={(s) => { setAttemptPicker(null); setStandaloneResult(s); }} />
      )}
      {standaloneResult && !standaloneReview && (
        <ResultScreen
          submission={standaloneResult} autoTimeout={false} autoViolation={false}
          onReview={() => setStandaloneReview(true)}
          onReattempt={() => { const t = (DB.mockTests[standaloneResult.subject] || []).find((x) => x.id === standaloneResult.testId); const subj = standaloneResult.subject; setStandaloneResult(null); if (t) { if (subj === OMR_SUBJECT) startTest(t, subj); else setActiveSession({ test: t, source: 'mock', subject: subj }); } }}
          onClose={() => setStandaloneResult(null)}
        />
      )}
      {standaloneResult && standaloneReview && (
        <ReviewScreen submission={standaloneResult} onBackToSummary={() => setStandaloneReview(false)} onClose={() => { setStandaloneReview(false); setStandaloneResult(null); }} />
      )}
    </div>
  );
              }
