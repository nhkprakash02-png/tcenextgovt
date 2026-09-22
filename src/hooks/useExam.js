'use client';

// Wraps the original's global `examState` + its mutator functions (handleOptionClick,
// clearResponse, markForReview, saveAndNext, goToQuestion, timer) into one React hook.
// Ported from index.html lines ~1690-1794.
//
// NOTE: no anti-cheat / tab-switch policing here, by explicit final decision — it was tried,
// removed, and re-added once already; this is confirmed as the settled behavior for both Mock
// Tests and Quiz. Only the timer-based auto-submit (time runs out) and the explicit "confirm
// before submitting the last question" prompt exist as auto-submit triggers.
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveExamProgress } from '../lib/examEngine';

export function useExam(initialState, userId, onFinish) {
  const [exam, setExam] = useState(initialState);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const persist = useCallback((next) => { saveExamProgress(userId, next); }, [userId]);

  // --- Timer (still auto-submits the instant time runs out) ---
  useEffect(() => {
    const id = setInterval(() => {
      setExam((prev) => {
        if (!prev) return prev;
        const remaining = prev.remaining - 1;
        const next = { ...prev, remaining };
        persist(next);
        if (remaining <= 0) { clearInterval(id); onFinishRef.current(next, true, false); }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flushTimeOnCurrent = (st) => {
    if (st.questionEnteredAt == null) return st;
    const now = Date.now();
    const timeSpent = [...st.timeSpent];
    timeSpent[st.current] = (timeSpent[st.current] || 0) + Math.max(0, Math.round((now - st.questionEnteredAt) / 1000));
    return { ...st, timeSpent, questionEnteredAt: now };
  };

  const goToQuestion = useCallback((idx) => {
    setExam((prev) => {
      let next = flushTimeOnCurrent(prev);
      const status = [...next.status];
      if (status[idx] === 'not-visited') status[idx] = 'not-answered';
      next = { ...next, status, current: idx };
      persist(next);
      return next;
    });
  }, [persist]);

  const examNav = useCallback((delta) => {
    setExam((prev) => {
      const idx = Math.max(0, Math.min(prev.current + delta, prev.questions.length - 1));
      let next = flushTimeOnCurrent(prev);
      const status = [...next.status];
      if (status[idx] === 'not-visited') status[idx] = 'not-answered';
      next = { ...next, status, current: idx };
      persist(next);
      return next;
    });
  }, [persist]);

  const handleOptionClick = useCallback((key) => {
    setExam((prev) => {
      const answers = [...prev.answers];
      const status = [...prev.status];
      if (answers[prev.current] === key) {
        answers[prev.current] = null;
        status[prev.current] = status[prev.current].includes('marked') ? 'marked' : 'not-answered';
      } else {
        answers[prev.current] = key;
        status[prev.current] = status[prev.current].includes('marked') ? 'answered-marked' : 'answered';
      }
      const next = { ...prev, answers, status };
      persist(next);
      return next;
    });
  }, [persist]);

  const clearResponse = useCallback(() => {
    setExam((prev) => {
      const answers = [...prev.answers]; answers[prev.current] = null;
      const status = [...prev.status]; status[prev.current] = status[prev.current].includes('marked') ? 'marked' : 'not-answered';
      const next = { ...prev, answers, status };
      persist(next);
      return next;
    });
  }, [persist]);

  const markForReview = useCallback(() => {
    setExam((prev) => {
      const status = [...prev.status];
      status[prev.current] = prev.answers[prev.current] ? 'answered-marked' : 'marked';
      const flushed = flushTimeOnCurrent({ ...prev, status });
      const nextIdx = Math.min(prev.current + 1, prev.questions.length - 1);
      const nextStatus = [...flushed.status];
      if (nextStatus[nextIdx] === 'not-visited') nextStatus[nextIdx] = 'not-answered';
      const next = { ...flushed, status: nextStatus, current: nextIdx };
      persist(next);
      return next;
    });
  }, [persist]);

  // Returns true if this was the last question (caller should show the confirm-submit prompt).
  const saveAndNext = useCallback(() => {
    let wasLast = false;
    setExam((prev) => {
      const status = [...prev.status];
      if (status[prev.current] === 'not-visited') status[prev.current] = prev.answers[prev.current] ? 'answered' : 'not-answered';
      if (prev.current === prev.questions.length - 1) {
        wasLast = true;
        const next = { ...prev, status };
        persist(next);
        return next;
      }
      const flushed = flushTimeOnCurrent({ ...prev, status });
      const nextIdx = Math.min(prev.current + 1, prev.questions.length - 1);
      const nextStatus = [...flushed.status];
      if (nextStatus[nextIdx] === 'not-visited') nextStatus[nextIdx] = 'not-answered';
      const next = { ...flushed, status: nextStatus, current: nextIdx };
      persist(next);
      return next;
    });
    return wasLast;
  }, [persist]);

  const toggleLang = useCallback(() => {
    setExam((prev) => ({ ...prev, lang: prev.lang === 'en' ? 'bn' : 'en' }));
  }, []);

  const finish = useCallback((autoTimeout, autoViolation) => {
    setExam((prev) => {
      const flushed = flushTimeOnCurrent(prev);
      onFinishRef.current(flushed, !!autoTimeout, !!autoViolation);
      return flushed;
    });
  }, []);

  return {
    exam,
    goToQuestion, examNav, handleOptionClick, clearResponse, markForReview, saveAndNext, toggleLang, finish,
  };
}
