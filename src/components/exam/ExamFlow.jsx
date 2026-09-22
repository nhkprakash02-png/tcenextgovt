'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { loadResumeData, clearExamProgress, createExamState, buildSubmission } from '../../lib/examEngine';
import ExamInstructions from './ExamInstructions';
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
export default function ExamFlow({ test, source, subject, onClose }) {
  const { DB, addSubmission, user, setExamInProgress } = useApp();
  const [phase, setPhase] = useState('instructions'); // instructions | running | result | review
  const [runningExamState, setRunningExamState] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [autoFlags, setAutoFlags] = useState({ timeout: false, violation: false });

  if (!test || !user) { onClose(); return null; }

  const resumeData = loadResumeData(user.id);

  const start = (examState) => {
    setRunningExamState(examState);
    setExamInProgress(true);
    setPhase('running');
  };

  const handleBegin = (lang) => start(createExamState(test, source, subject, lang));
  const handleResume = (data) => {
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
        test={test} user={user} resumeData={resumeData}
        onBegin={handleBegin} onResume={handleResume} onCancel={onClose}
      />
    );
  }

  if (phase === 'running' && runningExamState) {
    return <ExamRunner initialExam={runningExamState} user={user} onFinish={handleFinish} />;
  }

  if (phase === 'result' && lastSubmission) {
    return (
      <ResultScreen
        submission={lastSubmission} autoTimeout={autoFlags.timeout} autoViolation={autoFlags.violation}
        onReview={() => setPhase('review')}
        onReattempt={() => setPhase('instructions')}
        onClose={onClose}
      />
    );
  }

  if (phase === 'review' && lastSubmission) {
    return <ReviewScreen submission={lastSubmission} onBackToSummary={() => setPhase('result')} onClose={onClose} />;
  }

  return null;
}
