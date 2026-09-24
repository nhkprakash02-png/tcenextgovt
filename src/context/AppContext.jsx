'use client';

// Central app state. Replaces the original's global `let DB`, `let activeTab`, `getCurrentUser()`,
// `isAdmin()`, theme localStorage globals (index.html lines ~691-792) with React context.
//
// NEXT.JS MIGRATION NOTE — this file is where essentially all of the framework change lives.
// The provider's PUBLIC API is byte-for-byte the same as the Vite version (activeTab, setTab,
// goBack, canGoBack, deepLinkTestId, ...), so not one of the 40+ consuming components needed
// touching. What changed underneath:
//   * `activeTab` is now DERIVED from Next's usePathname() instead of being its own useState
//     seeded from window.location.pathname. Same tab ids, same lib/routes.js mapping — the URL
//     simply became the single source of truth, which is what makes real App Router pages work.
//   * `setTab` / `goBack` call router.push() instead of window.history.pushState(). The
//     tabStack "where did I come from" history that powers the in-app Back button is unchanged.
//   * The manual `popstate` listener is gone: the App Router already keeps usePathname() in
//     sync with the browser's own Back/Forward buttons, so keeping it would have double-handled
//     every navigation.
//   * localStorage reads moved out of useState initializers and into a mount effect. Client
//     components are still pre-rendered on the server in the App Router, where `localStorage`
//     doesn't exist — reading it during the initial render would both crash SSR and cause a
//     hydration mismatch. See the `hydrated` flag below for how persistence is gated on it.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import { loadDB, saveDB as persistDB, attachDbRealtimeListeners, attachSubmissionsRealtimeListener, writeSubmission, loadBanners } from '../lib/db';
import { emptyDB } from '../lib/seedData';
import { fbAuth } from '../firebase';
import { isExemptEmail, uid } from '../lib/utils';
import { PATH_FOR_TAB, tabForPath, parseTestDeepLink } from '../lib/routes';

const CUR_KEY = 'currentUser';
const ADM_KEY = 'tce_admin_session_v1';
const THEME_KEY = 'tce_theme';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  // The URL is the source of truth for which section is showing. tabForPath() is the same
  // mapping the Vite build used, so every `activeTab === 'mocks'`-style check still works.
  const activeTab = tabForPath(pathname);

  const [DB, setDB] = useState(emptyDB); // empty placeholder until Firestore loads — see emptyDB() in seedData.js
  const [dbLoading, setDbLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  // These three start at their neutral defaults and are filled in from localStorage on mount
  // (see the hydration effect below) rather than in a useState initializer, because this
  // component is server-pre-rendered and localStorage doesn't exist there.
  const [user, setUserState] = useState(null);
  const [admin, setAdminState] = useState(false);
  const [theme, setThemeState] = useState('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CUR_KEY) || 'null');
      if (stored) setUserState(stored);
    } catch (e) { /* ignore malformed stored user */ }
    try {
      setAdminState(localStorage.getItem(ADM_KEY) === '1');
      setThemeState(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');
    } catch (e) { /* ignore */ }
    setHydrated(true);
  }, []);

  // If the page was opened via a /test/:id deep link (see routes.js), this holds that testId
  // once, so MockTest.jsx can auto-select/launch it on first load. It's a one-shot value —
  // consumeDeepLinkTestId() below clears it after MockTest.jsx reads it, so navigating around
  // the app normally afterward never keeps re-triggering the same auto-launch. usePathname()
  // is available during the server render too, so this initializer is SSR-safe as written.
  const [deepLinkTestId, setDeepLinkTestId] = useState(() => parseTestDeepLink(pathname));
  const consumeDeepLinkTestId = useCallback(() => setDeepLinkTestId(null), []);
  const [tabStack, setTabStack] = useState([]); // history of previously-visited tabs, for goBack()
  const [examInProgress, setExamInProgress] = useState(false); // mirrors original's `examState` guard
  // Replaces original's openModal(html)/closeModal() + #modalRoot innerHTML swap (lines ~951-980).
  // `modal` is { type: 'login' | 'enroll' | 'adminLogin' | ..., props: {...} } | null.
  const [modal, setModalState] = useState(null);
  const openModal = useCallback((type, props = {}) => setModalState({ type, props }), []);
  const closeModal = useCallback(() => setModalState(null), []);

  // Boot: load DB + banners from Firestore, attach realtime listeners.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDB();
      if (cancelled) return;
      setDB(loaded);
      setDbLoading(false);
      // Signals the plain-HTML splash screen in app/layout.js to fade out now that real data has
      // actually arrived — see the inline script there for the bridge and the minimum-display-
      // time logic. Guarded since window.hideAppSplash won't exist outside a real browser (e.g.
      // during the server render, or any future test environment).
      if (typeof window !== 'undefined' && typeof window.hideAppSplash === 'function') window.hideAppSplash();
      const b = await loadBanners(loaded);
      if (!cancelled) setBanners(b);
    })();
    return () => { cancelled = true; };
  }, []);

  // Refs so the realtime-listener effect below can always read the LATEST DB/examInProgress
  // value without needing them in its dependency array — see the fix note in db.js for why
  // depending on DB directly caused a runaway resubscription loop that exhausted the daily
  // Firestore read quota. This effect now subscribes its 14 listeners exactly ONCE per session.
  const dbRef = useRef(DB);
  useEffect(() => { dbRef.current = DB; }, [DB]);
  const examInProgressRef = useRef(examInProgress);
  useEffect(() => { examInProgressRef.current = examInProgress; }, [examInProgress]);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  // Latest activeTab / tabStack, read synchronously by setTab and goBack. Same reason as above:
  // it keeps those two callbacks stable (no router-churn on every navigation) while still
  // letting them see the current values.
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  const tabStackRef = useRef(tabStack);
  useEffect(() => { tabStackRef.current = tabStack; }, [tabStack]);

  useEffect(() => {
    const unsub = attachDbRealtimeListeners(() => dbRef.current, (key, incoming) => {
      if (examInProgressRef.current) return; // never disrupt a test/quiz in progress
      setDB((prev) => ({ ...prev, [key]: incoming }));
    });
    return unsub;
  }, []);

  // Submissions have their own realtime listener, separate from the DB_KEYS one above, since
  // they now live in their own per-document collection (see SUBMISSIONS_COLLECTION in db.js) —
  // this is the actual fix for the "sequential submissions overwriting each other" bug. Doesn't
  // need the examInProgress guard the DB_KEYS listener uses: another student's submission
  // landing here just updates DB.submissions, which the exam screen itself never reads from
  // mid-test (only the result screen does, after finishing), so it can't disrupt anyone's
  // in-progress exam.
  useEffect(() => {
    const unsub = attachSubmissionsRealtimeListener((submissions) => {
      setDB((prev) => ({ ...prev, submissions }));
    });
    return unsub;
  }, []);

  // Records one finished exam attempt. This writes ONLY that submission's own Firestore
  // document (writeSubmission), never the whole submissions collection — see the fix note on
  // writeSubmission in db.js. The local state update here is optimistic (immediate UI update);
  // the realtime listener above will reconcile it with the server's copy shortly after.
  // FIX: previously this was fire-and-forget — a single writeSubmission() attempt, and on
  // failure, nothing but a browser alert(). If that write failed for ANY reason (a momentary
  // network drop, which is entirely plausible when several students submit around the same
  // moment at the end of a timed exam), the result was gone permanently: not in Firestore, so
  // invisible to the admin analysis panel, the per-test leaderboard, and everyone else's view —
  // even though the student's OWN browser had already shown them their result locally.
  //
  // Now: (1) retries the write a few times with a short backoff before giving up on the spot,
  // since most network blips resolve within seconds; (2) if it still fails, queues the
  // submission in localStorage instead of discarding it, and (3) a separate effect below
  // attempts to flush that queue on every app load (and whenever the browser regains a network
  // connection), so a result queued today because of a bad connection gets written the next
  // time this student's browser is online — without them needing to do anything.
  const PENDING_SUBMISSIONS_KEY = 'tce_pending_submissions';
  const readPendingSubmissions = () => { try { return JSON.parse(localStorage.getItem(PENDING_SUBMISSIONS_KEY) || '[]'); } catch (e) { return []; } };
  const writePendingSubmissions = (list) => { try { localStorage.setItem(PENDING_SUBMISSIONS_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ } };
  const queueSubmissionLocally = (sub) => {
    const pending = readPendingSubmissions();
    if (!pending.some((p) => p.id === sub.id)) writePendingSubmissions([...pending, sub]);
  };

  const addSubmission = useCallback((sub) => {
    setDB((prev) => ({ ...prev, submissions: [...prev.submissions, sub] }));
    const RETRY_DELAYS_MS = [1000, 3000, 7000]; // a few quick retries before falling back to the local queue
    const attempt = (retriesLeft) => {
      writeSubmission(sub).catch((err) => {
        if (retriesLeft > 0) {
          const delay = RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - retriesLeft] || 7000;
          setTimeout(() => attempt(retriesLeft - 1), delay);
          return;
        }
        console.error('Failed to save submission after retries — queued locally for later:', err);
        queueSubmissionLocally(sub);
        alert("⚠ Your result couldn't be saved to the cloud right now due to a connection issue. It's safely stored on this device and will be saved automatically the next time you open this site with a working connection — please don't clear your browser data before then.");
      });
    };
    attempt(RETRY_DELAYS_MS.length);
  }, []);

  // Flushes any submissions that got stuck in the local queue on a PREVIOUS visit (e.g. this
  // student's connection dropped mid-exam last time and they closed the tab before it retried
  // successfully). Runs once DB has loaded, and again whenever the browser regains connectivity.
  useEffect(() => {
    if (dbLoading) return;
    const flush = () => {
      const pending = readPendingSubmissions();
      if (!pending.length) return;
      pending.forEach((sub) => {
        writeSubmission(sub)
          .then(() => writePendingSubmissions(readPendingSubmissions().filter((p) => p.id !== sub.id)))
          .catch((err) => console.warn('Still unable to flush a queued submission:', err));
      });
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [dbLoading]);

  // Writing the theme back to localStorage is gated on `hydrated` so the default 'dark' used
  // for the server render can never clobber a stored 'light' preference in the split second
  // before the hydration effect above has read it. (The <html> class itself is also set
  // pre-paint by the inline script in app/layout.js, so there's no flash of the wrong theme.)
  useEffect(() => {
    // Skip until the stored preference has been read. Before that point the inline boot script
    // in app/layout.js has already put the correct class on <html>, so running this early with
    // the default 'dark' would briefly undo it — and writing to localStorage early would
    // clobber a stored 'light' with that same default.
    if (!hydrated) return;
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme !== 'light');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, hydrated]);

  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'light' ? 'dark' : 'light')), []);

  const setUser = useCallback((u) => {
    setUserState(u);
    if (u) localStorage.setItem(CUR_KEY, JSON.stringify(u));
    else localStorage.removeItem(CUR_KEY);
  }, []);

  const setAdmin = useCallback((v) => {
    setAdminState(v);
    if (v) localStorage.setItem(ADM_KEY, '1');
    else localStorage.removeItem(ADM_KEY);
  }, []);

  // Full session teardown for the student-facing "Logout" button. Previously this only cleared
  // the student's own `user` state — but if that same browser had EVER separately logged into
  // the Admin Panel in this session, the admin flag stays true independently (it has its own
  // logout button inside the Admin Panel), so a brand-new account created right after would
  // silently inherit full/unlocked access via `hasFullAccess = admin || isExemptUser`. This is
  // what actually caused "a fresh new account inherits the previous account's unlocked state" —
  // logout now clears both, guaranteeing a truly clean slate for whoever signs in next on this
  // browser. Also clears any exam-resume progress so a new account never sees a stale
  // "Resume Previous Attempt" prompt belonging to someone else.
  // FIX: this previously only cleared the app's own `user` state — it never called Firebase's
  // own signOut(). That meant the browser's underlying Firebase Auth session stayed alive after
  // "logging out," so a student who logged out and then clicked "Continue with Google" again
  // with the SAME account was, from Firebase's point of view, already signed in: no real auth
  // state change occurred, so onAuthStateChanged never fired again, and this app's `user` never
  // got re-populated from their existing Firestore record. From the outside this looked like
  // "logging in with the same Google account a second time just doesn't work." Calling
  // signOut(fbAuth) here makes logout a real state transition, so the next sign-in reliably
  // fires onAuthStateChanged and correctly reconnects them to their existing account and data.
  const logout = useCallback(() => {
    if (user) { try { localStorage.removeItem('tce_exam_resume_' + user.id); } catch (e) { /* ignore */ } }
    if (fbAuth) signOut(fbAuth).catch((e) => console.warn('Firebase sign-out error', e));
    setUser(null);
    setAdmin(false);
  }, [user, setUser, setAdmin]);

  // setTab records where you came FROM onto a small history stack, so goBack() can retrace
  // your steps within the app (Home, Mock Tests, Dashboard, etc.) — this is what powers the
  // on-page Back button. Under Next it navigates to that section's real App Router route with
  // router.push(); activeTab then follows from the new pathname automatically.
  const setTab = useCallback((id) => {
    const prev = activeTabRef.current;
    if (prev !== id) {
      activeTabRef.current = id; // avoid double-stacking if setTab fires twice before the route commits
      setTabStack((stack) => [...stack, prev].slice(-20)); // cap history length
      const path = PATH_FOR_TAB[id] || '/';
      if (window.location.pathname !== path) router.push(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  const goBack = useCallback(() => {
    const stack = tabStackRef.current;
    const nextTab = stack.length ? stack[stack.length - 1] : 'home';
    const path = PATH_FOR_TAB[nextTab] || '/';
    activeTabRef.current = nextTab;
    setTabStack((s) => (s.length ? s.slice(0, -1) : s));
    if (window.location.pathname !== path) router.push(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router]);

  // Call after any in-memory DB mutation to persist to Firestore (fire-and-forget, matches
  // original saveDB() semantics — UI updates optimistically, sync happens in the background).
  const saveDB = useCallback((updater) => {
    setDB((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      persistDB(next);
      return next;
    });
  }, []);

  const isEnrolled = useCallback(() => {
    if (!user) return false;
    if (isExemptEmail(user.email)) return true;
    const rec = DB.students.find((s) => s.id === user.id);
    return !!(rec && rec.paymentStatus === 'Approved');
  }, [user, DB.students]);

  // FIX (added after comparing against a working sibling project's implementation): this
  // listener previously only knew about TWO outcomes for a brand-new Firebase user — an
  // existing student record, or "must be a first-time Google sign-in" (open GoogleRegisterModal).
  // That second assumption was wrong for a fresh EMAIL/PASSWORD signup: createUserWithEmailAnd
  // Password() also fires this same onAuthStateChanged listener, and since no student record
  // exists yet at that instant, this listener would open GoogleRegisterModal by mistake —
  // asking for a password again, with the name showing as the generic "Student" fallback —
  // for a fraction of a second, before AuthModal.jsx's own post-signup code corrected things.
  // Non-deterministic: whether the glitch was visible depended on exact timing.
  //
  // pendingSignupProfileRef fixes this: AuthModal.jsx's signupUser() calls
  // setPendingSignupProfile({name, phone}) BEFORE calling createUserWithEmailAndPassword, so by
  // the time this listener fires, it can tell "brand-new signup, here's the name/phone already
  // collected" apart from "brand-new Google sign-in, still need to ask for their phone" — and
  // creates the Firestore profile directly for the former, never touching the modal at all.
  const pendingSignupProfileRef = useRef(null);
  const setPendingSignupProfile = useCallback((p) => { pendingSignupProfileRef.current = p; }, []);

  // Completes Google sign-in (signInWithRedirect() in AuthModal.jsx — see that file for why
  // redirect is used instead of a popup).
  //
  // This is split into two parts on purpose:
  //  1. getRedirectResult() is called once, immediately, purely to surface any sign-in ERROR
  //     right away (e.g. account-exists-with-different-credential). It is NOT relied on to
  //     detect a successful sign-in — that API is a one-shot call that Firebase's own docs
  //     note can silently return nothing if it's called even slightly late, and gating it
  //     behind `dbLoading` (as the previous version did) was exactly that kind of delay: sign-in
  //     would fully succeed with Google, but the app would never notice.
  //  2. onAuthStateChanged() is the actual source of truth. Firebase guarantees this fires once
  //     its internal auth state has finished restoring — including right after a redirect
  //     completes — so this is what reliably drives "log this person into the app." As a bonus,
  //     it also means a student who signed in with Google before gets recognized automatically
  //     on future visits, not just immediately after a fresh redirect. It's also the single
  //     place that logs someone in for EVERY method — Google, email/password login, or a brand
  //     new email/password signup — uniformly, which is what fixes the race described above.
  useEffect(() => {
    if (!fbAuth) return;
    getRedirectResult(fbAuth).catch((e) => console.warn('Google redirect sign-in error', e));
  }, []);

  useEffect(() => {
    if (!fbAuth || dbLoading) return;
    const unsub = onAuthStateChanged(fbAuth, (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.email) return;
      const currentUser = userRef.current;
      if (currentUser && (currentUser.email || '').toLowerCase() === firebaseUser.email.toLowerCase()) return; // already logged in as this account
      const profile = { uid: firebaseUser.uid, name: firebaseUser.displayName || 'Student', email: firebaseUser.email, phone: firebaseUser.phoneNumber || '', photoURL: firebaseUser.photoURL || '' };
      // Matches by Firebase uid FIRST (added alongside the fix above) — the most reliable key,
      // since it can never collide or change, unlike email/phone. Existing students created
      // before this field existed simply have no `uid` yet, so they fall through to the
      // email/phone match exactly as before; nothing about their record needs to change for
      // this to keep working.
      const existing = dbRef.current.students.find((s) =>
        s.uid === firebaseUser.uid ||
        (s.email || '').toLowerCase() === profile.email.toLowerCase() ||
        (profile.phone && s.phone === profile.phone));
      if (existing) {
        pendingSignupProfileRef.current = null; // this account already has a profile — any stale pending signup data is irrelevant
        // Backfills the Firebase uid (for faster/more reliable matching next time) and the
        // Google profile photo — but only if missing, so this never overwrites a custom avatar
        // or an existing uid link.
        const needsPhoto = profile.photoURL && !existing.photoURL;
        const needsUid = !existing.uid;
        if (needsPhoto || needsUid) {
          const updated = { ...existing, ...(needsPhoto ? { photoURL: profile.photoURL } : {}), ...(needsUid ? { uid: firebaseUser.uid } : {}) };
          saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === existing.id ? updated : s)) }));
          setUser(updated);
        } else {
          setUser(existing);
        }
        closeModal();
        // Was setActiveTabState('dashboard') pre-migration; now a real route change, which is
        // the equivalent since activeTab is derived from the URL.
        router.push(PATH_FOR_TAB.dashboard);
      } else if (pendingSignupProfileRef.current) {
        // A brand-new email/password signup, with name/phone already collected on the form —
        // create their profile directly here, with no modal detour.
        const pending = pendingSignupProfileRef.current;
        pendingSignupProfileRef.current = null;
        const student = { id: uid('st'), uid: firebaseUser.uid, name: pending.name, email: profile.email, phone: pending.phone, address: '', joinDate: new Date().toISOString().slice(0, 10), registeredAt: new Date().toISOString(), paymentStatus: 'Not Enrolled', batch: '—', pendingReview: true };
        saveDB((prev) => ({ ...prev, students: [...prev.students, student] }));
        setUser(student);
        closeModal();
        router.push(PATH_FOR_TAB.dashboard);
      } else {
        // A brand-new Google sign-in with no prior signup form data — still need to ask for
        // the one missing detail (phone) via GoogleRegisterModal.
        setModalState({ type: 'googleRegister', props: { profile } });
      }
    });
    return unsub;
  }, [dbLoading, saveDB, setUser, router, closeModal]);

  // True for the 4 exempt mentor/admin accounts — full content access bypass everywhere a mock
  // test or material would otherwise check the site-admin flag. Kept separate from `admin`
  // (which specifically means "logged into the Admin Panel") so the two privileges don't get
  // conflated — an exempt student never gets Admin Panel access from this alone.
  const isExemptUser = isExemptEmail(user?.email);
  const hasFullAccess = admin || isExemptUser;

  const value = useMemo(() => ({
    DB, setDB, saveDB, dbLoading,
    banners, setBanners,
    user, setUser, admin, setAdmin,
    theme, toggleTheme,
    activeTab, setTab, goBack, canGoBack: tabStack.length > 0,
    examInProgress, setExamInProgress,
    isEnrolled, isExemptUser, hasFullAccess, logout,
    deepLinkTestId, consumeDeepLinkTestId, addSubmission,
    modal, openModal, closeModal, setPendingSignupProfile,
  }), [DB, saveDB, dbLoading, banners, user, setUser, admin, setAdmin, theme, toggleTheme, activeTab, setTab, goBack, tabStack, examInProgress, isEnrolled, isExemptUser, hasFullAccess, logout, deepLinkTestId, consumeDeepLinkTestId, addSubmission, modal, openModal, closeModal, setPendingSignupProfile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
