// Pure logic for the shared CBT exam engine (Mock Tests / PYQ / Quiz). No DOM access, no
// globals — everything here takes its state as arguments, so it's usable from a React hook
// or a test file equally. Ported from index.html lines ~1484-1493, 1848-1972, 2157-2193.
import { uid, isExemptEmail } from './utils';

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function findTestById(DB, testId, source, subject) {
  if (source === 'mock') return (DB.mockTests[subject] || []).find((t) => t.id === testId);
  if (source === 'pyq') return DB.pyqSets.find((t) => t.id === testId);
  return null;
}

export function resumeKey(userId) { return userId ? 'tce_exam_resume_' + userId : null; }

export function loadResumeData(userId) {
  const rk = resumeKey(userId);
  if (!rk) return null;
  try { return JSON.parse(localStorage.getItem(rk) || 'null'); } catch { return null; }
}
export function saveExamProgress(userId, examState) {
  const rk = resumeKey(userId);
  if (!rk || !examState) return;
  const { timer, ...toSave } = examState;
  localStorage.setItem(rk, JSON.stringify(toSave));
}
export function clearExamProgress(userId) {
  const rk = resumeKey(userId);
  if (rk) localStorage.removeItem(rk);
}

// Builds the initial exam state for a fresh attempt (mirrors beginExam()).
export function createExamState(test, source, subject, chosenLang) {
  const shuffledQ = shuffle(test.questions);
  const status = new Array(shuffledQ.length).fill('not-visited');
  status[0] = 'not-answered';
  return {
    testId: test.id, source, subject: subject || test.subject || 'pyq', title: test.title,
    durationSec: test.durationMin * 60, remaining: test.durationMin * 60,
    marksCorrect: test.marksCorrect, marksWrong: test.marksWrong, questions: shuffledQ,
    answers: new Array(shuffledQ.length).fill(null), status,
    timeSpent: new Array(shuffledQ.length).fill(0), questionEnteredAt: Date.now(),
    current: 0, violations: 0, lang: chosenLang, startedAt: Date.now(),
  };
}

// Normalizes a question's "correct answer" field to an option key ('A'/'B'/'C'/'D'), however
// it was originally recorded (letter, 0-based index, or matched by option text) — used by both
// Quick Quiz (GK pool questions may predate the 'correct' field convention) and the Admin bulk
// question uploader. Ported verbatim from index.html lines ~2951-2966.
export function resolveCorrectKey(q) {
  let c = q.correct;
  if (c === undefined || c === null || c === '') {
    c = q.correctAnswer !== undefined ? q.correctAnswer : (q.answer !== undefined ? q.answer : (q.correctIndex !== undefined ? q.correctIndex : q.correctOption));
  }
  if (typeof c === 'number' && c >= 0 && c <= 3) return String.fromCharCode(65 + c);
  if (typeof c === 'string') {
    const t = c.trim();
    if (/^[A-Da-d]$/.test(t)) return t.toUpperCase();
    if (/^[0-3]$/.test(t)) return String.fromCharCode(65 + parseInt(t, 10));
    const opts = q.options || [];
    const match = opts.find((o) => (o.textEn || o.text || '').trim().toLowerCase() === t.toLowerCase());
    if (match) return match.key || String.fromCharCode(65 + opts.indexOf(match));
  }
  return 'A';
}

// Converts whatever shape a question's options were uploaded/stored in — plain strings,
// objects missing a `key`, objects using `text`/`label` instead of `textEn`, or even an
// object keyed by letter (e.g. {"A": "...", "B": "..."}) instead of an array — into the
// canonical { key, textEn, textBn } shape the exam UI expects. This is what actually fixes
// "no usable questions" false rejections: instead of just checking the shape is already
// perfect (and silently discarding everything if it isn't), this repairs it on the fly.
export function normalizeOptions(rawOptions) {
  if (!rawOptions) return [];
  // Object-keyed shape, e.g. {"A": "Delhi", "B": "Mumbai", ...} or {"a": "...", "b": "..."}
  if (!Array.isArray(rawOptions) && typeof rawOptions === 'object') {
    return Object.keys(rawOptions)
      .sort()
      .map((k) => ({ key: k.trim().toUpperCase(), textEn: (rawOptions[k] ?? '').toString().trim(), textBn: '' }))
      .filter((o) => o.textEn.length > 0);
  }
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions
    .map((o, i) => {
      const fallbackKey = String.fromCharCode(65 + i);
      if (o && typeof o === 'object') {
        const key = (typeof o.key === 'string' && o.key.trim()) ? o.key.trim().toUpperCase() : fallbackKey;
        const textEn = (o.textEn || o.text || o.label || o.value || '').toString().trim();
        return { key, textEn, textBn: o.textBn || '' };
      }
      return { key: fallbackKey, textEn: (o ?? '').toString().trim(), textBn: '' };
    })
    .filter((o) => o.textEn.length > 0);
}

// Full pipeline: normalize a raw question (however it was uploaded) into one the exam engine
// can render safely — normalized options first, then resolve the correct-answer key against
// those normalized options (so the text-matching fallback in resolveCorrectKey works too).
export function normalizeQuestion(q) {
  const options = normalizeOptions(q.options);
  const withOptions = { ...q, options };
  return { ...withOptions, correct: resolveCorrectKey(withOptions) };
}

export function sectionDisplayName(subject) {
  const map = { math: 'Elementary Mathematics', english: 'English Language', reasoning: 'General Reasoning', gk: 'General Knowledge', full: 'Combined Section', quiz: 'General Knowledge', pyq: 'Previous Year Section' };
  return map[subject] || (subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : 'Section');
}

// Quiz duration formula: ~30 seconds per question, rounded up to the nearest whole minute.
// Matches the requested presets exactly (5→3, 10→5, 15→8, 20→10) and extends the same rule to
// any custom question count the student enters.
export function quizDurationMinutes(questionCount) {
  return Math.max(1, Math.ceil(questionCount * 0.5));
}

// Scores a finished exam and builds the submission record (mirrors finishExam()'s scoring half).
export function buildSubmission(examState, DB, user) {
  const st = examState;
  let correct = 0, wrong = 0, unanswered = 0;
  st.questions.forEach((q, i) => {
    if (st.answers[i] === null || st.answers[i] === undefined) unanswered++;
    else if (st.answers[i] === q.correct) correct++; else wrong++;
  });
  const score = +(correct * st.marksCorrect - wrong * st.marksWrong).toFixed(2);
  const maxScore = +(st.questions.length * st.marksCorrect).toFixed(2);
  const accuracy = (correct + wrong) > 0 ? +((correct / (correct + wrong)) * 100).toFixed(1) : 0;
  const attemptNo = DB.submissions.filter((s) => s.testId === st.testId && s.studentId === user.id).length + 1;
  const timeTakenSec = st.durationSec - st.remaining;
  return {
    id: uid('sub'), testId: st.testId, testType: st.source || 'mock', subject: st.subject, testTitle: st.title,
    studentId: user.id, studentName: user.name, studentPhone: user.phone || '', studentEmail: user.email || '',
    attempt: attemptNo, score, maxScore, correct, wrong, unanswered, accuracy, timeTakenSec, durationSec: st.durationSec,
    date: new Date().toISOString(),
    detail: st.questions.map((q, i) => ({ q, given: st.answers[i], timeSpent: st.timeSpent[i] || 0 })),
  };
}

// Robust exemption check for a submission: checks BOTH the email stored directly on the
// submission (set at the time it was created) AND a fresh lookup of that student's CURRENT
// profile email. The second check matters because any submission recorded before the
// `studentEmail` field existed on submissions (or any other historical inconsistency) would
// have no way to be caught by checking the stored field alone — this closes that gap, which is
// what let an exempt account's older/unlabeled submission leak onto the leaderboard.
export function isExemptSubmission(sub, students) {
  if (isExemptEmail(sub.studentEmail)) return true;
  const rec = (students || []).find((s) => s.id === sub.studentId);
  return !!(rec && isExemptEmail(rec.email));
}

// Returns only the chronologically EARLIEST submission per (student, test) pair — i.e. each
// student's real first attempt — computed fresh from the actual dates rather than trusting the
// `.attempt` number stored on each submission. This is deliberately more robust than filtering
// on `attempt === 1`: if that stored number was ever wrong for any reason (a data import, a
// race condition, anything), this still gets the right answer, since it only looks at what
// chronologically happened first.
export function firstAttemptSubmissions(submissions) {
  const earliestByKey = {};
  submissions.forEach((s) => {
    const key = s.studentId + '::' + s.testId;
    const cur = earliestByKey[key];
    if (!cur || new Date(s.date).getTime() < new Date(cur.date).getTime()) earliestByKey[key] = s;
  });
  const firstIds = new Set(Object.values(earliestByKey).map((s) => s.id));
  return submissions.filter((s) => firstIds.has(s.id));
}

// Shared base filter for anything that should only ever consider "real" leaderboard-eligible
// attempts: paid mock tests only (no quiz, no PYQ, no free-demo mocks), the 4 exempt accounts
// fully excluded, and only each student's genuine first attempt per test.
function eligiblePaidMockFirstAttempts(DB) {
  const paidMockSubs = DB.submissions.filter((s) => {
    if (s.testType !== 'mock') return false;
    if (isExemptSubmission(s, DB.students)) return false;
    const test = (DB.mockTests[s.subject] || []).find((t) => t.id === s.testId);
    return !!test && !test.isDemo;
  });
  return firstAttemptSubmissions(paidMockSubs);
}

function averageByStudent(subs) {
  const byStudent = {};
  subs.forEach((s) => {
    const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
    if (!byStudent[s.studentId]) byStudent[s.studentId] = { studentId: s.studentId, studentName: s.studentName, total: 0, count: 0 };
    byStudent[s.studentId].total += pct;
    byStudent[s.studentId].count += 1;
  });
  return Object.values(byStudent)
    .map((e) => ({ studentId: e.studentId, studentName: e.studentName, avgPct: +(e.total / e.count).toFixed(1) }))
    .sort((a, b) => b.avgPct - a.avgPct)
    .slice(0, 5);
}

// Internal only — computes the Friday 00:00:00 -> Monday 00:00:00 (i.e. through Sunday
// 11:59:59.999 PM) window that's currently either in progress or was most recently completed,
// relative to `now`. This is intentionally an internal calculation detail: the weekly
// leaderboard should always reflect "the most relevant Fri-Sun weekend," but the site never
// displays this window to visitors — see computeHomeLeaderboard below.
function getWeekendWindow(now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const daysSinceFriday = (day + 2) % 7; // Fri=0, Sat=1, Sun=2, Mon=3, ... Thu=6
  start.setDate(start.getDate() - daysSinceFriday);
  const end = new Date(start);
  end.setDate(start.getDate() + 3); // following Monday 00:00:00 — exclusive upper bound
  return { start, end };
}

// Homepage Top 5 leaderboard. Both periods are restricted to paid mock tests, first-attempt
// only, exempt accounts fully excluded (see eligiblePaidMockFirstAttempts above). Ranked by
// AVERAGE PERCENTAGE so tests with different total marks compare fairly.
//
// - Weekly: strictly the Friday 00:00 -> Sunday 11:59:59 PM window. If that window (or the
//   current one, if it's still in progress) has zero qualifying attempts, this walks backward
//   one week at a time until it finds a week that does, and shows THAT week's results — so the
//   board never resets to blank or changes just because a stray attempt landed outside the
//   active window ("Inter-Week Result Persistence").
// - Monthly: every first-attempt paid-mock submission dated within the current calendar month
//   AND dated on a Friday/Saturday/Sunday (i.e. taken during one of that month's weekend
//   windows) — matching "average of first attempts... within the Friday-Sunday timeline of the
//   mock tests conducted that month." Same backward-walk persistence if the current month has
//   no qualifying attempts yet.
export function computeHomeLeaderboard(DB, period) {
  const eligible = eligiblePaidMockFirstAttempts(DB);

  if (period === 'monthly') {
    const cursor = new Date();
    for (let i = 0; i < 24; i++) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const subsThisMonth = eligible.filter((s) => {
        const d = new Date(s.date);
        if (d.getFullYear() !== y || d.getMonth() !== m) return false;
        return [5, 6, 0].includes(d.getDay()); // Fri, Sat, Sun only
      });
      if (subsThisMonth.length) return averageByStudent(subsThisMonth);
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return [];
  }

  let anchor = new Date();
  for (let i = 0; i < 52; i++) {
    const { start, end } = getWeekendWindow(anchor);
    const subsThisWeek = eligible.filter((s) => { const t = new Date(s.date).getTime(); return t >= start.getTime() && t < end.getTime(); });
    if (subsThisWeek.length) return averageByStudent(subsThisWeek);
    anchor = new Date(start.getTime() - 24 * 60 * 60 * 1000); // step back into the prior week
  }
  return [];
}

// Per-test leaderboard (shown on that test's own Result screen). Unlike the homepage board,
// this intentionally uses each student's BEST score across ALL their attempts — so a re-attempt
// that improves a student's score correctly improves their rank HERE, while never touching the
// homepage board (which stays locked to first attempts only, computed separately above).
export function buildLeaderboard(submissions, testId, students) {
  return submissions.filter((s) => s.testId === testId && !isExemptSubmission(s, students))
    .reduce((acc, s) => {
      const ex = acc.find((a) => a.studentId === s.studentId);
      if (!ex || s.score > ex.score) { acc = acc.filter((a) => a.studentId !== s.studentId); acc.push(s); }
      return acc;
    }, [])
    .sort((a, b) => b.score - a.score);
}

// Also excludes exempt accounts, so their test-content-review attempts never skew the
// "X% of students answered this correctly" stat shown to real students.
export function computeCommunityAccuracy(submissions, testId, questionId, students) {
  const subs = submissions.filter((s) => s.testId === testId && !isExemptSubmission(s, students));
  let attempted = 0, correct = 0;
  subs.forEach((s) => {
    const d = (s.detail || []).find((x) => x.q && x.q.id === questionId);
    if (d && d.given) { attempted++; if (d.given === d.q.correct) correct++; }
  });
  return attempted > 0 ? Math.round((correct / attempted) * 100) : null;
}

export function classifySpeed(timeSpent, expectedPerQ, isCorrect, attempted) {
  if (!attempted) return null;
  const ratio = expectedPerQ > 0 ? timeSpent / expectedPerQ : 1;
  if (isCorrect) {
    if (ratio <= 0.6) return { label: 'Superfast', icon: 'zap', color: 'text-emerald-400' };
    if (ratio <= 1.4) return { label: 'On Time', icon: 'check-circle', color: 'text-sky-400' };
    return { label: 'Slow', icon: 'clock', color: 'text-amber-400' };
  }
  if (ratio <= 1.4) return { label: 'On Time but not Correct', icon: 'alert-circle', color: 'text-red-400' };
  return { label: 'Slow', icon: 'clock', color: 'text-amber-400' };
}

export function fmtReviewTime(secs) {
  const m = Math.floor((secs || 0) / 60), s = Math.round((secs || 0) % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* Branded Scorecard (canvas-based image) — ported from drawScorecardCanvas() verbatim. */
export function drawScorecardCanvas(sub, rank) {
  const canvas = document.createElement('canvas');
  canvas.width = 900; canvas.height = 550;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 900, 550);
  grad.addColorStop(0, '#0B0B0B'); grad.addColorStop(1, '#161f2e');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 900, 550);
  const goldGrad = ctx.createLinearGradient(0, 0, 900, 0);
  goldGrad.addColorStop(0, '#F59E0B'); goldGrad.addColorStop(0.5, '#D97706'); goldGrad.addColorStop(1, '#FBBF24');
  ctx.fillStyle = goldGrad; ctx.fillRect(0, 0, 900, 10);
  ctx.fillStyle = goldGrad; ctx.font = 'bold 34px Arial'; ctx.fillText('TCE - The Competitive Edge', 40, 70);
  ctx.fillStyle = '#94A3B8'; ctx.font = '16px Arial'; ctx.fillText('Official Score Card', 40, 100);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 26px Arial'; ctx.fillText(sub.testTitle, 40, 160);
  ctx.fillStyle = '#94A3B8'; ctx.font = '16px Arial'; ctx.fillText('Candidate: ' + sub.studentName + '   |   Attempt #' + sub.attempt, 40, 195);
  const stats = [['Score', sub.score + ' / ' + sub.maxScore], ['Rank', '#' + rank], ['Accuracy', sub.accuracy + '%'], ['Correct/Wrong', sub.correct + ' / ' + sub.wrong]];
  stats.forEach((s, i) => {
    const x = 40 + (i % 2) * 430, y = 250 + Math.floor(i / 2) * 110;
    ctx.strokeStyle = 'rgba(217,119,6,0.4)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, 400, 90);
    ctx.fillStyle = '#94A3B8'; ctx.font = '14px Arial'; ctx.fillText(s[0].toUpperCase(), x + 20, y + 30);
    ctx.fillStyle = goldGrad; ctx.font = 'bold 32px Arial'; ctx.fillText(String(s[1]), x + 20, y + 68);
  });
  ctx.fillStyle = '#94A3B8'; ctx.font = '13px Arial';
  ctx.fillText('Near Nahata Anchal, Nahata, P.S. Gopalnagar, North 24 Parganas, West Bengal - 743290', 40, 520);
  return canvas;
}
export function downloadScorecard(sub, rank) {
  const canvas = drawScorecardCanvas(sub, rank);
  const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'TCE_Scorecard_' + sub.studentName.replace(/\s+/g, '_') + '.png'; a.click();
}
/* Offline printable question paper — ported from printOfflinePaper() (lines ~2997-3022). */
export function printOfflinePaper(test) {
  if (!test) return;
  const html = `
  <div style="font-family:Arial, sans-serif; color:#000; padding:20px; max-width:800px; margin:0 auto;">
    <h2 style="text-align:center;margin-bottom:4px;">TCE - The Competitive Edge</h2>
    <p style="text-align:center;margin-top:0;font-size:12px;">Near Nahata Anchal, Nahata, P.S. Gopalnagar, North 24 Parganas, West Bengal - 743290</p>
    <hr>
    <h3>${test.title}</h3>
    <p style="font-size:13px;">Duration: ${test.durationMin} min &nbsp; | &nbsp; Marks: +${test.marksCorrect} / -${test.marksWrong} &nbsp; | &nbsp; Total Questions: ${test.questions.length}</p>
    <p style="font-size:12px;">Name: ______________________ &nbsp; Roll No: ____________ &nbsp; Date: ____________</p>
    <hr>
    ${test.questions.map((q, i) => `
      <div style="margin-bottom:14px; page-break-inside:avoid;">
        <p style="font-weight:bold; margin-bottom:4px;">${i + 1}. ${q.textEn} ${q.textBn ? ('&nbsp; / ' + q.textBn) : ''}</p>
        <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:13px;">
          ${q.options.map((o) => `<span>(${o.key}) ${o.textEn}</span>`).join('')}
        </div>
      </div>`).join('')}
    <hr>
    <p style="font-size:11px; text-align:center;">© TCE - The Competitive Edge | tcenahata@gmail.com | +91 73846 44030</p>
  </div>`;
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>${test.title} - Print</title></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

export function shareScorecardWhatsApp(sub, rank) {
  downloadScorecard(sub, rank);
  const text = `My TCE Score Card 🏆\n${sub.testTitle}\nScore: ${sub.score}/${sub.maxScore} | Rank #${rank} | Accuracy: ${sub.accuracy}%\n- TCE The Competitive Edge`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// Paid mock tests can be renamed by an admin (via MockManager's "Edit Test Info") after
// students have already attempted them. Submissions always keep their original `testTitle`
// snapshot so historical data never breaks, but the Analysis Panel / attempt history should show
// the *current* title for a still-existing PAID mock. This intentionally does nothing for PYQ
// attempts, Quiz attempts, or free-demo mock attempts — those keep showing their stored title,
// exactly as before.
export function liveSubmissionTitle(DB, sub) {
  if (sub && sub.testType === 'mock' && sub.subject && DB && DB.mockTests && DB.mockTests[sub.subject]) {
    const liveTest = DB.mockTests[sub.subject].find((t) => t.id === sub.testId);
    if (liveTest && liveTest.title && !liveTest.isDemo) return liveTest.title;
  }
  return sub.testTitle;
}
