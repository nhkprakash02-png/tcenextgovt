'use client';

import React from 'react';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ImageDown, MessageCircle, Repeat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sectionDisplayName, buildLeaderboard, downloadScorecard, shareScorecardWhatsApp, liveSubmissionTitle } from '../../lib/examEngine';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';
import Avatar from '../Avatar';

function fmtTime(secs) { const m = Math.floor((secs || 0) / 60), s = (secs || 0) % 60; return `${m}:${String(s).padStart(2, '0')}`; }

export default function ResultScreen({ submission: sub, autoTimeout, autoViolation, onReview, onReattempt, onClose }) {
  const { DB, setTab } = useApp();
  useLockBodyScroll(true);
  const displayTitle = liveSubmissionTitle(DB, sub);
  const leaderboard = buildLeaderboard(DB.submissions, sub.testId, DB.students);
  const rank = leaderboard.findIndex((s) => s.id === sub.id) + 1;
  const attempted = sub.correct + sub.wrong;
  const percentile = leaderboard.length > 1 ? (((leaderboard.length - rank) / (leaderboard.length - 1)) * 100).toFixed(1) : '100.0';
  const cutoff = +(sub.maxScore * 0.33).toFixed(2);
  const cutoffGap = +(sub.score - cutoff).toFixed(2);
  const topper = leaderboard[0] || sub;
  const avgScore = +(leaderboard.reduce((a, s) => a + s.score, 0) / leaderboard.length).toFixed(2);
  const avgAccuracy = +(leaderboard.reduce((a, s) => a + s.accuracy, 0) / leaderboard.length).toFixed(1);
  const avgCorrect = Math.round(leaderboard.reduce((a, s) => a + s.correct, 0) / leaderboard.length);
  const avgWrong = Math.round(leaderboard.reduce((a, s) => a + s.wrong, 0) / leaderboard.length);
  const avgTime = Math.round(leaderboard.reduce((a, s) => a + (s.timeTakenSec || 0), 0) / leaderboard.length);
  const weak = sub.accuracy < 50;
  const stats = [['Rank', '#' + rank], ['Score', sub.score + ' / ' + sub.maxScore], ['Attempted', attempted + ' / ' + sub.detail.length], ['Accuracy', sub.accuracy + '%'], ['Percentile', percentile + '%']];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full btn-ghost text-xs font-bold shadow-lg"
        style={{ background: 'var(--panel)' }}
        title="Back to where you started this test"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
      <div className="max-w-3xl mx-auto px-4 py-10">
        {autoTimeout && <div className="mb-4 text-center text-xs bg-amber-500/15 gold-text rounded-lg py-2">⏱ Time up — test auto-submitted.</div>}
        {autoViolation && <div className="mb-4 text-center text-xs bg-red-500/15 text-red-400 rounded-lg py-2">⚠ Auto-submitted after 3 tab-switch violations.</div>}

        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 gold-text mx-auto mb-2" />
          <h2 className="font-display font-800 text-2xl">TCE — {displayTitle}</h2>
          <p className="muted text-sm">Attempt #{sub.attempt} — Overall Performance Summary</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {stats.map(([label, val]) => (
            <div key={label} className="card glow-border rounded-xl p-4 text-center">
              <p className="text-[10px] muted uppercase">{label}</p>
              <p className="font-display font-800 text-lg gold-text mt-1">{val}</p>
            </div>
          ))}
        </div>

        <div className="card glow-border rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${cutoffGap >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            {cutoffGap >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-400" /> : <TrendingDown className="w-6 h-6 text-red-400" />}
          </div>
          <p className="text-sm sm:text-base font-semibold">You scored <span className={`font-bold ${cutoffGap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.abs(cutoffGap)} Marks</span> {cutoffGap >= 0 ? 'more' : 'less'} than the estimated cutoff ({cutoff})!</p>
        </div>

        {weak ? (
          <div className="card glow-border rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap" style={{ borderColor: 'rgba(245,158,11,0.5)' }}>
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
            <div><p className="font-semibold text-sm">Strong basics can instantly lift your score!</p><p className="text-xs muted mt-0.5">Revisit this section's weak topics and re-attempt the test to build accuracy.</p></div>
          </div>
        ) : (
          <div className="card glow-border rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap" style={{ borderColor: 'rgba(16,185,129,0.5)' }}>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            <div><p className="font-semibold text-sm">Strong performance!</p><p className="text-xs muted mt-0.5">Your accuracy is solid — keep practicing to climb further up the leaderboard.</p></div>
          </div>
        )}

        <div className="card glow-border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-700 text-sm mb-4">Sectional Summary — {sectionDisplayName(sub.subject)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="muted text-left"><th className="py-1.5" /><th>Score</th><th>Accuracy</th><th>Correct</th><th>Wrong</th><th>Time</th></tr></thead>
              <tbody>
                <tr style={{ borderTop: '1px solid var(--border)' }}><td className="py-1.5 font-semibold">You</td><td>{sub.score}/{sub.maxScore}</td><td>{sub.accuracy}%</td><td className="text-emerald-400">{sub.correct}</td><td className="text-red-400">{sub.wrong}</td><td>{fmtTime(sub.timeTakenSec)}</td></tr>
                <tr style={{ borderTop: '1px solid var(--border)' }}><td className="py-1.5 font-semibold gold-text">Topper</td><td>{topper.score}/{sub.maxScore}</td><td>{topper.accuracy}%</td><td className="text-emerald-400">{topper.correct}</td><td className="text-red-400">{topper.wrong}</td><td>{fmtTime(topper.timeTakenSec)}</td></tr>
                <tr style={{ borderTop: '1px solid var(--border)' }}><td className="py-1.5 font-semibold muted">Average</td><td>{avgScore}/{sub.maxScore}</td><td>{avgAccuracy}%</td><td className="text-emerald-400">{avgCorrect}</td><td className="text-red-400">{avgWrong}</td><td>{fmtTime(avgTime)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card glow-border rounded-2xl p-5 mb-6">
          <h3 className="font-display font-700 text-sm mb-4">🏆 Top Rankers — Your Rank: <span className="gold-text">#{rank}</span></h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 ${s.id === sub.id ? 'card2 rounded-lg px-2 py-1.5' : 'px-2 py-1.5'}`}>
                <span className={`w-6 text-xs font-bold ${i < 3 ? 'gold-text' : 'muted'}`}>{i + 1}.</span>
                <Avatar name={s.studentName} photoURL={(DB.students.find((st) => st.id === s.studentId) || {}).photoURL} sizeClass="w-8 h-8" textSizeClass="text-xs" />
                <span className={`text-xs flex-1 ${s.id === sub.id ? 'font-bold' : ''}`}>{s.studentName}{s.id === sub.id ? ' (You)' : ''}</span>
                <span className="text-xs gold-text font-semibold">{s.score}/{sub.maxScore}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <button onClick={() => downloadScorecard({ ...sub, testTitle: displayTitle }, rank)} className="btn-ghost rounded-lg px-5 py-2.5 text-xs font-bold flex items-center gap-1.5"><ImageDown className="w-3.5 h-3.5" />Download Scorecard</button>
          <button onClick={() => shareScorecardWhatsApp({ ...sub, testTitle: displayTitle }, rank)} className="rounded-lg px-5 py-2.5 text-xs font-bold bg-[#25D366] text-white flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />Share on WhatsApp</button>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={onReview} className="btn-ghost rounded-lg px-5 py-2.5 text-xs font-bold">Review Full Solutions</button>
          <button onClick={onReattempt} className="btn-gold rounded-lg px-5 py-2.5 text-xs font-bold flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" />Re-Attempt Test</button>
          <button onClick={() => { onClose(); setTab('dashboard'); }} className="btn-ghost rounded-lg px-5 py-2.5 text-xs font-bold">Go to Dashboard</button>
        </div>
      </div>
    </div>
  );
}
