'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { loadResumeData, clearExamProgress, saveExamProgress, createExamState, buildSubmission } from '../../lib/examEngine';
import { OMR_PRE_EXAM_SECONDS } from '../../lib/omr';
import { loadPre, savePre, clearPre } from '../../lib/omrSession';
import useWakeLock from '../../hooks/useWakeLock';
import ExamInstructions from './ExamInstructions';
import OmrPreExam from './OmrPreExam';
import ExamRunner from './ExamRunner';
import ResultScreen from './ResultScreen';
import ReviewScreen from './ReviewScreen';

// Drives the full exam lifecycle for one test attempt: instructions -> running -> result ->
// (optional) review -> back to result, or re-attempt (loops back to instructions).
// `test` is a fully-resolved test object (a DB.mockTests[subject][i] / DB.pyqSets[i] entry,
// or a synthetic one built on the fly for Quick Quiz) — resolving it is the caller's job so
// this component works identically for mock/pyq/quiz. `source` is 'mock' | 'pyq' | 'quiz'.
// Mirrors: showPreExamInstructions -> beginExam/resumeExam -> renderExamScreen -> finishExam ->
// renderResultScreen -> reviewSolutions (lines ~1494-2155).
//
// Offline / OMR mocks (test.omr is set) add three things, and nothing else changes for other tests:
//   * first attempt: instructions -> 5-minute pre-exam window (phase 'omrWait') -> exam auto-starts
//   * re-attempt:    instructions (with the confirmation checkbox) -> exam, same set, no window
//   * `omrAction` ('wait' | 'autostart' | 'resume') lets the app drop the student straight back into
//     the right step after they left the page, switched app, or the app was closed.
export default function ExamFlow({ test, source, subject, onClose, omrAction }) {
  const { DB, addSubmission, user, setExamInProgress } = useApp();
  const [phase, setPhase] = useState('instructions'); // instructions | omrWait | running | result | review
  const [runningExamState, setRunningExamState] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [autoFlags, setAutoFlags] = useState({ timeout: false, violation: false });
  const [omrMode, setOmrMode] = useState(test && test.omr ? (test.omrFlow || 'reattempt') : null); // 'first' | 'reattempt' | null
  const [omrRecord, setOmrRecord] = useState(null);
  const bootedRef = useRef(false);

  // Screen stays awake for the whole exam (and the OMR pre-exam window).
  useWakeLock(phase === 'running' || phase === 'omrWait');

  // Jump straight to the right step for an Offline / OMR exam that was already under way.
  useEffect(() => {
    if (bootedRef.current || !omrAction || !test || !user) return;
    bootedRef.current = true;
    if (omrAction === 'wait') {
      const rec = loadPre(user.id, test.id);
      if (rec) { setOmrRecord(rec); setPhase('omrWait'); } else onClose();
    } else if (omrAction === 'autostart') {
      const rec = loadPre(user.id, test.id);
      if (rec) beginOmr(rec); else onClose();
    } else if (omrAction === 'resume') {
      const data = loadResumeData(user.id);
      if (data && data.testId === test.id) handleResume(data); else onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!test || !user) { onClose(); return null; }

  const resumeData = loadResumeData(user.id);

  const start = (examState) => {
    setRunningExamState(examState);
    setExamInProgress(true);
    setPhase('running');
  };

  // Starts the Offline / OMR exam when its 5-minute window is over. The exam clock starts at the
  // END of the window (not when the screen happened to open), so time spent away is not lost.
  const beginOmr = (rec) => {
    const dueMs = rec.startedAt + OMR_PRE_EXAM_SECONDS * 1000;
    const elapsed = Math.max(0, Math.floor((Date.now() - dueMs) / 1000));
    clearPre(user.id, test.id);
    if (elapsed >= test.durationMin * 60) {
      alert('The exam time for this Offline / OMR mock has already ended while the app was closed, so the attempt could not be started.');
      onClose();
      return;
    }
    const st = createExamState(test, source, subject, rec.lang || 'en');
    const exam = { ...st, startedAt: dueMs, remaining: st.durationSec - elapsed };
    saveExamProgress(user.id, exam); // saved immediately so a crash right now can still be resumed
    start(exam);
  };

  const handleBegin = (lang) => {
    if (omrMode === 'first') {
      // First Offline / OMR attempt: the 5-minute window starts now, with the set assigned for this student.
      const rec = { setLetter: test.omr.set, startedAt: Date.now(), lang, proceeded: false };
      savePre(user.id, test.id, rec);
      setOmrRecord(rec);
      setPhase('omrWait');
      return;
    }
    start(createExamState(test, source, subject, lang)); // normal tests, and OMR re-attempts (same set, no window)
  };

  const handleResume = (data) => {
    if (data.omr) {
      // Offline / OMR: continue on the real clock. If the total time ran out while the app was
      // closed, the answers saved so far are submitted now (exam time hit 00:00).
      const remaining = data.durationSec - Math.floor((Date.now() - data.startedAt) / 1000);
      if (remaining <= 0) { handleFinish({ ...data, remaining: 0, questionEnteredAt: null }, true, false); return; }
      start({ ...data, remaining, questionEnteredAt: Date.now() });
      return;
    }
    const withTimer = { ...data, questionEnteredAt: Date.now() };
    start(withTimer);
  };

  const handleFinish = (finalExamState, autoTimeout, autoViolation) => {
    setExamInProgress(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const submission = buildSubmission(finalExamState, DB, user);
    addSubmission(submission);
    clearExamProgress(user.id);
    setLastSubmission(submission);
    setAutoFlags({ timeout: !!autoTimeout, violation: !!autoViolation });
    setPhase('result');
  };

  if (phase === 'instructions') {
    return (
      <ExamInstructions
        test={test} user={user} resumeData={omrMode ? null : resumeData} omrMode={omrMode}
        onBegin={handleBegin} onResume={handleResume} onCancel={onClose}
      />
    );
  }

  if (phase === 'omrWait' && omrRecord) {
    return <OmrPreExam test={test} user={user} record={omrRecord} onAutoStart={() => beginOmr(omrRecord)} onGoBack={onClose} />;
  }

  if (phase === 'running' && runningExamState) {
    return <ExamRunner initialExam={runningExamState} user={user} onFinish={handleFinish} />;
  }

  if (phase === 'result' && lastSubmission) {
    return (
      <ResultScreen
        submission={lastSubmission} autoTimeout={autoFlags.timeout} autoViolation={autoFlags.violation}
        onReview={() => setPhase('review')}
        onReattempt={() => { if (omrMode) setOmrMode('reattempt'); setPhase('instructions'); }}
        onClose={onClose}
      />
    );
  }

  if (phase === 'review' && lastSubmission) {
    return <ReviewScreen submission={lastSubmission} onBackToSummary={() => setPhase('result')} onClose={onClose} />;
  }

  return null;
}
