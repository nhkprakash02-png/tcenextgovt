> Carried over unchanged from the React/Vite build. It maps the ORIGINAL single-file
> `index.html` app to this codebase's modules, and is still accurate — the Next.js
> migration moved `src/pages/` to `src/views/` and `src/App.jsx` to
> `src/components/AppShell.jsx`, but did not move any logic between modules.
> See README.md for the Vite → Next.js mapping.

# Migration Map — index.html → React

Status: **feature-complete port**. Every module from the original 3,448-line `index.html`
has been ported into the modular structure below. Line numbers reference the *original*
uploaded file, so you can diff behavior against the source if something looks off.

## Where everything went

| Original (index.html)                                   | New location                                                        |
|-----------------------------------------------------------|----------------------------------------------------------------------|
| Firebase config (compat SDK)                              | `src/firebase.js` (modular SDK) |
| `seedDB()`, `normalizeDB()` (~286-460)                     | `src/lib/seedData.js` |
| Firestore chunked read/write (~501-691)                    | `src/lib/db.js` |
| Global helpers: `uid`, `priceLabel`, `timeAgo`, etc (~286-323) | `src/lib/utils.js` |
| Global `DB`, `activeTab`, `getCurrentUser()`, theme, modal state | `src/context/AppContext.jsx` (`useApp()` hook) |
| `renderNav`/`toggleMobileMenu` (~700-764)                  | `src/components/Navbar.jsx` |
| `renderTicker` (~906)                                      | `src/components/Ticker.jsx` |
| `renderHero`/`startHeroAuto`/swipe (~800-905)               | `src/components/HeroCarousel.jsx` |
| `renderMentors` (~919-946)                                  | `src/components/Mentors.jsx` |
| Footer markup (~184-222)                                    | `src/components/Footer.jsx` |
| `openLoginModal`/`loginUser`/`signupUser`/`googleSignIn` (~1037-1188) | `src/components/AuthModal.jsx` |
| `openEnrollModal`/`submitPaymentRef` (~1193-1238)            | `src/components/EnrollModal.jsx` |
| `openAdminLogin`/`adminLogin` (~2616-2645)                   | `src/components/AdminLoginModal.jsx` |
| `tplHome` (~1273-1310)                                       | `src/pages/Home.jsx` |
| `tplBatches` (~2467-2491)                                    | `src/pages/Batches.jsx` |
| `tplDashboard` (~2493-2531)                                  | `src/pages/Dashboard.jsx` |
| `tplNotices`/`submitInquiry` (~2533-2584)                    | `src/pages/Notices.jsx` |
| `tplMaterials` + watermark preview/download (~2285-2465)     | `src/pages/StudyMaterials.jsx` + `src/lib/watermark.js` |
| **CBT Exam Engine** (shared by Mocks/PYQ/Quiz, ~1482-2196)   | see below |
| `tplMocks`/`initMocksTab`/`canAccessMock` (~1312-1424)       | `src/pages/MockTest.jsx` |
| `tplPyq`/`initPyqTab` (~1428-1479)                           | `src/pages/PyqHub.jsx` |
| `tplQuiz`/`initQuizTab`/`showQuizInstructions`/`beginQuickQuiz` (~2196-2283) | `src/pages/Quiz.jsx` |
| **Admin Control Panel** (~2648-3412)                         | see below |

## CBT Exam Engine breakdown

The original's single global `examState` + ~700 lines of DOM-mutating functions became:

- `src/lib/examEngine.js` — pure functions with no DOM/globals: `shuffle`, `findTestById`,
  `createExamState`, `buildSubmission`, `buildLeaderboard`, `classifySpeed`,
  `computeCommunityAccuracy`, `drawScorecardCanvas` + `downloadScorecard`/`shareScorecardWhatsApp`,
  `printOfflinePaper`, `resolveCorrectKey`.
- `src/hooks/useExam.js` — the stateful hook wrapping what was `examState` + its mutators
  (`handleOptionClick`, `saveAndNext`, timer `setInterval`, anti-cheat `blur`/`visibilitychange`/
  `fullscreenchange` listeners).
- `src/components/exam/ExamInstructions.jsx` — pre-exam modal + resume-attempt check.
- `src/components/exam/ExamRunner.jsx` — the full-screen CBT UI (timer, palette, anti-cheat warnings).
- `src/components/exam/ResultScreen.jsx` — scorecard/analysis screen.
- `src/components/exam/ReviewScreen.jsx` — full solution review + re-attempt mode.
- `src/components/exam/ExamFlow.jsx` — orchestrates the phase transitions between the four above
  (`instructions → running → result → review`), used identically by Mock Tests, PYQ, and Quiz.
- `src/components/exam/AttemptSelector.jsx` — the "pick which attempt to analyze" modal.

## Admin Control Panel breakdown

`src/pages/AdminPanel.jsx` is the tab shell; each tab is its own file under `src/components/admin/`:

| Tab | Original functions | File |
|---|---|---|
| Pending Approvals | `adminPendingView`, `purgeExpiredPendingSignups` | `PendingApprovals.jsx` |
| Students | `adminStudentsView`, `addStudentManually`, `grantAccess`, `blockStudent`, `exportStudentsExcel` | `StudentsManager.jsx` |
| Mock Results | `adminResultsView`, `renderResultsTable`, `exportResultsExcel` | `ResultsManager.jsx` |
| Mock/PYQ Manager | `adminQuestionsView`, `addNewMockTest`, `editTestMeta`, etc. | `MockManager.jsx` |
| PYQ Uploader | `adminPyqView`, `addNewPyqSet`, exam-category CRUD | `PyqManager.jsx` |
| GK Quiz Uploader | `adminGkQuizView`, `bulkUploadGkQuiz`, quiz duration settings | `GkQuizManager.jsx` |
| Materials | `adminMaterialsView`, `uploadMaterial` (PDF → base64) | `MaterialsManager.jsx` |
| Batches | `adminBatchesView`, `addBatch`, `editBatch` | `BatchesManager.jsx` |
| Banner Slider | `adminBannersView`, `uploadBanner` (image → base64) | `BannersManager.jsx` |
| Notices | `adminContentView` | `NoticesManager.jsx` |
| Settings | `adminSettingsView`, `exportBackup`/`importBackup` | `SettingsManager.jsx` |

`QuestionEditor.jsx` is a shared component (add-question form + bulk JSON uploader + question
list) used by both `MockManager` and `PyqManager`, since the original's `addQuestionToTest`/
`bulkUploadQuestions`/`editQuestion`/`deleteQuestion` were already shared across `'mock'`/`'pyq'`
via the `kind` parameter.

## Deliberate, low-risk deviations from the original

These are the only intentional differences — everything else is a direct 1:1 port:

1. **Firebase compat SDK → modular SDK.** Same project/config, same Firestore documents and
   collection layout (`tce_app_data/{key}`, chunked sub-collections) — just modern
   `import { doc, getDoc, ... } from 'firebase/firestore'` syntax instead of `firebase.firestore()`.
   No data migration needed; it reads/writes the exact same documents your live site already uses.
2. **`prompt()`/`confirm()` kept for admin meta-edits** (test title, exam category, batch
   features, etc.) — this is an admin-only internal tool, and replacing every one of these with
   a custom form would have meaningfully slowed delivery for close to zero real benefit. If you'd
   like proper inline edit forms for any specific one, say which and I'll build it.
3. **Tailwind CDN → Tailwind build (PostCSS).** Same design tokens (`gold`/`ink`/`panel` colors,
   `Inter`/`Poppins`/`Noto Sans Bengali` fonts) — just compiled at build time instead of loaded
   from a CDN `<script>`, which is faster and more reliable in production.
4. **Google redirect sign-in completion moved to `AppContext`.** The original called
   `fbAuth.getRedirectResult()` once at boot, at global scope. Since there's no equivalent
   always-running global scope in a component tree, this now lives in an effect in
   `AppContext.jsx` that runs once the initial DB load finishes — functionally identical, just
   relocated to where the app's "always mounted" scope actually is.

## Known pre-existing issue carried over as-is (flag for you, not silently fixed)

- The admin password (`ADMIN_EMAIL` / `ADMIN_PASSWORD_DEFAULT`) is a plaintext constant checked
  client-side in `src/components/AdminLoginModal.jsx` — identical to the original. Anyone can
  read it out of the shipped JS bundle. Recommended fix before relying on this in production:
  move admin auth to Firebase Auth + a custom claim or a server-side check (a small Cloud
  Function), rather than a client-side string comparison. Happy to build this if you want it.
