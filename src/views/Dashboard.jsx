'use client';

import React, { useState } from 'react';
import { Lock, BarChart2, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validateSourcePhoto } from '../lib/imageUtils';
import { liveSubmissionTitle } from '../lib/examEngine';
import Avatar from '../components/Avatar';
import ImageCropperModal from '../components/ImageCropperModal';
import ResultScreen from '../components/exam/ResultScreen';
import ReviewScreen from '../components/exam/ReviewScreen';

function ScoreTable({ title, rows, emptyLabel, emptyTab, onGo, onAnalyze }) {
  const { setTab, DB } = useApp();
  return (
    <div className="mb-8">
      <h3 className="font-display font-700 text-lg mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs card glow-border rounded-xl overflow-hidden">
          <thead className="card2">
            <tr className="text-left muted">
              <th className="p-3">Test</th><th>Attempt</th><th>Score</th><th>Accuracy</th><th>Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((s, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-3">{liveSubmissionTitle(DB, s)}</td>
                <td>#{s.attempt}</td>
                <td className="gold-text font-semibold">{s.score}/{s.maxScore}</td>
                <td>{s.accuracy}%</td>
                <td>{new Date(s.date).toLocaleDateString()}</td>
                <td className="p-3">
                  <button onClick={() => onAnalyze(s)} className="btn-gold rounded-md px-2.5 py-1.5 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                    <BarChart2 className="w-3 h-3" />Analysis
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td className="p-3 muted" colSpan={6}>{emptyLabel} <button onClick={() => setTab(emptyTab)} className="gold-text underline">{onGo}</button></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { DB, saveDB, user, openModal, setTab } = useApp();
  const [viewSub, setViewSub] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [cropFile, setCropFile] = useState(null); // File pending crop, or null

  if (!user) {
    return (
      <div className="text-center py-16">
        <Lock className="w-10 h-10 gold-text mx-auto mb-3" />
        <p className="muted mb-4">Please login to view your dashboard.</p>
        <button onClick={() => openModal('login')} className="btn-gold rounded-lg px-6 py-2.5 text-sm font-bold">Student Login</button>
      </div>
    );
  }

  const rec = DB.students.find((s) => s.id === user.id) || user;
  const subs = [...DB.submissions].filter((s) => s.studentId === user.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const quizSubs = subs.filter((s) => s.testType === 'quiz');
  const pyqSubs = subs.filter((s) => s.testType === 'pyq');
  const mockSubs = subs.filter((s) => s.testType !== 'quiz' && s.testType !== 'pyq');
  const statusColor = rec.paymentStatus === 'Approved' ? 'bg-emerald-500/20 text-emerald-400'
    : rec.paymentStatus === 'Pending' ? 'bg-amber-500/20 gold-text' : 'bg-gray-500/20 muted';

  // "Re-attempt" from a dashboard-opened analysis hands off to the relevant hub page, where a
  // Re-attempt button for that exact test already exists — avoids duplicating the test-lookup/
  // launch logic that MockTest.jsx / PyqHub.jsx / Quiz.jsx each already own.
  const reattemptTabFor = (sub) => (sub.testType === 'pyq' ? 'pyq' : sub.testType === 'quiz' ? 'quiz' : 'mocks');

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    const error = validateSourcePhoto(file);
    if (error) { alert(error); return; }
    setCropFile(file); // valid — open the cropper
  };

  const handleCropSave = (base64) => {
    saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === user.id ? { ...s, photoURL: base64 } : s)) }));
    setCropFile(null);
  };

  return (
    <div>
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="card glow-border rounded-2xl p-5 sm:col-span-1">
          <div className="relative w-14 h-14 mb-3">
            <Avatar name={user.name} photoURL={rec.photoURL} sizeClass="w-14 h-14" textSizeClass="text-xl" />
            <label
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gold-grad flex items-center justify-center cursor-pointer shadow-md"
              title="Change profile photo"
            >
              <Camera className="w-3.5 h-3.5 text-ink" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <p className="font-display font-700">{user.name}</p>
          <p className="text-xs muted">{rec.phone || rec.email || ''}</p>
          <span className={`badge mt-3 inline-block ${statusColor}`}>{rec.paymentStatus}</span>
          <p className="text-xs muted mt-2">Batch: <span className="text-current font-semibold">{rec.batch || '—'}</span></p>
          <p className="text-[10px] muted mt-2">Photo must be under 1MB.</p>
        </div>
        <div className="card glow-border rounded-2xl p-5 text-center flex flex-col justify-center">
          <p className="text-[10px] muted uppercase">Mock Attempts</p><p className="font-display font-800 text-2xl gold-text">{mockSubs.length}</p>
        </div>
        <div className="card glow-border rounded-2xl p-5 text-center flex flex-col justify-center">
          <p className="text-[10px] muted uppercase">PYQ Attempts</p><p className="font-display font-800 text-2xl gold-text">{pyqSubs.length}</p>
        </div>
        <div className="card glow-border rounded-2xl p-5 text-center flex flex-col justify-center">
          <p className="text-[10px] muted uppercase">Quiz Attempts</p><p className="font-display font-800 text-2xl gold-text">{quizSubs.length}</p>
        </div>
      </div>

      <ScoreTable title="Mock Test Score History" rows={mockSubs} emptyLabel="No mock attempts yet." emptyTab="mocks" onGo="Take one now" onAnalyze={setViewSub} />
      <ScoreTable title="PYQ Attempts" rows={pyqSubs} emptyLabel="No PYQ attempts yet." emptyTab="pyq" onGo="Browse PYQ Hub" onAnalyze={setViewSub} />
      <ScoreTable title="Quiz Stats" rows={quizSubs} emptyLabel="No quiz attempts yet." emptyTab="quiz" onGo="Try one now" onAnalyze={setViewSub} />

      {viewSub && !reviewing && (
        <ResultScreen
          submission={viewSub} autoTimeout={false} autoViolation={false}
          onReview={() => setReviewing(true)}
          onReattempt={() => { const tab = reattemptTabFor(viewSub); setViewSub(null); setTab(tab); }}
          onClose={() => setViewSub(null)}
        />
      )}
      {viewSub && reviewing && (
        <ReviewScreen submission={viewSub} onBackToSummary={() => setReviewing(false)} onClose={() => { setReviewing(false); setViewSub(null); }} />
      )}

      {cropFile && <ImageCropperModal file={cropFile} onCancel={() => setCropFile(null)} onSave={handleCropSave} />}
    </div>
  );
}
