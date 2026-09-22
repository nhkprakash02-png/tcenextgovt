'use client';

import React, { useMemo, useState } from 'react';
import { Search, Repeat, BarChart2, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ExamFlow from '../components/exam/ExamFlow';
import AttemptSelector from '../components/exam/AttemptSelector';
import ResultScreen from '../components/exam/ResultScreen';
import ReviewScreen from '../components/exam/ReviewScreen';

const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

export default function PyqHub() {
  const { DB, user, openModal } = useApp();
  const [categoryTab, setCategoryTab] = useState('all');
  const [year, setYear] = useState('all');
  const [searchQ, setSearchQ] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [attemptPicker, setAttemptPicker] = useState(null);
  const [standaloneResult, setStandaloneResult] = useState(null);
  const [standaloneReview, setStandaloneReview] = useState(false);

  const list = useMemo(() => {
    let l = DB.pyqSets.slice();
    if (categoryTab !== 'all') l = l.filter((p) => p.examCategory === categoryTab);
    if (year !== 'all') l = l.filter((p) => p.year === year);
    if (searchQ.trim()) { const q = searchQ.trim().toLowerCase(); l = l.filter((p) => (p.title + ' ' + p.examCategory + ' ' + p.year).toLowerCase().includes(q)); }
    return l;
  }, [DB.pyqSets, categoryTab, year, searchQ]);

  const startTest = (test) => {
    if (!user) { alert('Please login to start the test (attempts are tracked in your dashboard).'); openModal('login'); return; }
    setActiveSession({ test, source: 'pyq' });
  };

  const openAnalysis = (testId) => {
    const subs = DB.submissions.filter((s) => s.testId === testId && user && s.studentId === user.id).sort((a, b) => b.attempt - a.attempt);
    if (!subs.length) { alert('No attempt found for this test yet.'); return; }
    setAttemptPicker(subs);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-800 text-2xl mb-1">Previous Year <span className="gold-text">Questions Hub</span></h2>
          <p className="muted text-sm">Practice real exam papers — filter by exam, year, or search by keyword.</p>
        </div>
        <span className="badge bg-emerald-500/20 text-emerald-400 w-fit">✅ 100% FREE — No Batch Enrollment Required</span>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted" />
        <input type="text" placeholder='Search e.g. "WBP 2024" or "SSC GD Shift 1"' value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm" />
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-3">
        <button onClick={() => setCategoryTab('all')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${categoryTab === 'all' ? 'tab-active' : 'card2 muted'}`}>All Exams</button>
        {DB.examCategories.map((c) => (
          <button key={c} onClick={() => setCategoryTab(c)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${categoryTab === c ? 'tab-active' : 'card2 muted'}`}>{c}</button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-6">
        <button onClick={() => setYear('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${year === 'all' ? 'tab-active' : 'card2 muted'}`}>All Years</button>
        {YEARS.map((y) => <button key={y} onClick={() => setYear(y)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${year === y ? 'tab-active' : 'card2 muted'}`}>{y}</button>)}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length ? list.map((p) => {
          const attempts = DB.submissions.filter((s) => s.testId === p.id && user && s.studentId === user.id).length;
          return (
            <div key={p.id} className="card glow-border rounded-2xl p-5 flex flex-col">
              <span className="badge bg-amber-500/15 gold-text inline-block mb-2 w-fit">{p.examCategory} • {p.year}</span>
              <h3 className="font-display font-700 text-sm mb-1">{p.title}</h3>
              <p className="text-xs muted mb-3">{p.questions.length} Questions • {p.durationMin} min • +{p.marksCorrect}/-{p.marksWrong}</p>
              {attempts > 0 && <p className="text-[11px] muted mb-2">Attempts so far: <span className="gold-text font-semibold">{attempts}</span></p>}
              {attempts > 0 ? (
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button onClick={() => startTest(p)} className="btn-gold rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1"><Repeat className="w-3.5 h-3.5" />Re-attempt</button>
                  <button onClick={() => openAnalysis(p.id)} className="btn-ghost rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1"><BarChart2 className="w-3.5 h-3.5" />Analysis</button>
                </div>
              ) : (
                <button onClick={() => startTest(p)} className="mt-auto btn-gold rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Play className="w-3.5 h-3.5" />Start Test
                </button>
              )}
            </div>
          );
        }) : <p className="muted text-sm col-span-full">No PYQ sets match your filters.</p>}
      </div>

      {activeSession && (
        <ExamFlow test={activeSession.test} source={activeSession.source} onClose={() => setActiveSession(null)} />
      )}
      {attemptPicker && (
        <AttemptSelector submissions={attemptPicker} onClose={() => setAttemptPicker(null)} onPick={(s) => { setAttemptPicker(null); setStandaloneResult(s); }} />
      )}
      {standaloneResult && !standaloneReview && (
        <ResultScreen
          submission={standaloneResult} autoTimeout={false} autoViolation={false}
          onReview={() => setStandaloneReview(true)}
          onReattempt={() => { const t = DB.pyqSets.find((x) => x.id === standaloneResult.testId); setStandaloneResult(null); if (t) setActiveSession({ test: t, source: 'pyq' }); }}
          onClose={() => setStandaloneResult(null)}
        />
      )}
      {standaloneResult && standaloneReview && (
        <ReviewScreen submission={standaloneResult} onBackToSummary={() => setStandaloneReview(false)} onClose={() => { setStandaloneReview(false); setStandaloneResult(null); }} />
      )}
    </div>
  );
}
