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
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { loadDB, saveDB as persistDB, attachDbRealtimeListeners, attachSubmissionsRealtimeListener, writeSubmission, loadBanners } from '../lib/db';
import { emptyDB } from '../lib/seedData';
import { fbAuth } from '../firebase';
import { isExemptEmail } from '../lib/utils';
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
  const addSubmission = useCallback((sub) => {
    setDB((prev) => ({ ...prev, submissions: [...prev.submissions, sub] }));
    writeSubmission(sub).catch((err) => {
      console.error('Failed to save submission:', err);
      alert('⚠ Could not sync this result to the cloud database. Please check your internet connection — your local result is still visible, but may not be saved permanently.');
    });
  }, []);

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
  const logout = useCallback(() => {
    if (user) { try { localStorage.removeItem('tce_exam_resume_' + user.id); } catch (e) { /* ignore */ } }
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
  //     on future visits, not just immediately after a fresh redirect.
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
      const profile = { name: firebaseUser.displayName || 'Student', email: firebaseUser.email, phone: firebaseUser.phoneNumber || '', photoURL: firebaseUser.photoURL || '' };
      const existing = dbRef.current.students.find((s) =>
        (s.email || '').toLowerCase() === profile.email.toLowerCase() ||
        (profile.phone && s.phone === profile.phone));
      if (existing) {
        // Auto-fill the Google profile photo as their avatar — but only if they don't already
        // have one (a previously-uploaded cropped photo, or a Google photo from a past login),
        // so this never overwrites a custom avatar they've since chosen.
        if (profile.photoURL && !existing.photoURL) {
          const updated = { ...existing, photoURL: profile.photoURL };
          saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === existing.id ? updated : s)) }));
          setUser(updated);
        } else {
          setUser(existing);
        }
        // Was setActiveTabState('dashboard') pre-migration; now a real route change, which is
        // the equivalent since activeTab is derived from the URL.
        router.push(PATH_FOR_TAB.dashboard);
      } else {
        setModalState({ type: 'googleRegister', props: { profile } });
      }
    });
    return unsub;
  }, [dbLoading, saveDB, setUser, router]);

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
    modal, openModal, closeModal,
  }), [DB, saveDB, dbLoading, banners, user, setUser, admin, setAdmin, theme, toggleTheme, activeTab, setTab, goBack, tabStack, examInProgress, isEnrolled, isExemptUser, hasFullAccess, logout, deepLinkTestId, consumeDeepLinkTestId, addSubmission, modal, openModal, closeModal]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
