# TCE — The Competitive Edge (Next.js / App Router)

Migration of the existing React + Vite SPA to **Next.js 14 (App Router)**.
Every feature, component, modal, sticky header, batch pricing card (with the diagonal slash),
mock-test submission logic, analysis panel and admin feature is preserved exactly. **52 of the
53 application source files are byte-for-byte identical to the originals** apart from an added
`'use client'` directive; only `ExamRunner.jsx` needed a one-line change (see below).

## Run it

```bash
npm install
npm run dev     # http://localhost:5000
npm run build
npm start
```

Copy `.env.example` to `.env.local` if you want to supply the Firebase config via environment
variables. (Working fallbacks for the live `tce-nahata` project are still hard-coded in
`src/firebase.js`, exactly as before.)

## Directory map

| Vite | Next.js | Notes |
| --- | --- | --- |
| `index.html` | `src/app/layout.js` | `<head>` became `metadata` / `viewport` exports; the inline splash screen CSS, markup and bridge script are carried over verbatim |
| `src/main.jsx` | `src/app/layout.js` | `AppProvider` now wraps the App Router tree |
| `src/App.jsx` | `src/components/AppShell.jsx` | Same chrome, same order; the `PAGES[activeTab]` lookup is replaced by `{children}` |
| `src/pages/*.jsx` | `src/views/*.jsx` | **Renamed.** `src/pages` would have been picked up as the legacy Pages Router and collided with `src/app` |
| *(client-side tab state)* | `src/app/<route>/page.js` | One real route per section |
| `src/styles/index.css` | `src/app/globals.css` | Unchanged |
| `vercel.json` rewrites | *(removed)* | Next handles routing natively |

### Routes

Identical URLs to before — `lib/routes.js` (`PATH_FOR_TAB`) is untouched and is still the single
source of truth, so the existing `public/sitemap.xml` stays correct.

```
/                    → Home
/mock-tests          → MockTest
/quick-quiz          → Quiz
/pyq-hub             → PyqHub
/study-materials     → StudyMaterials
/batches-fees        → Batches
/dashboard           → Dashboard
/notices-contact     → Notices
/test/[testId]       → MockTest (share/deep link)
not-found.js         → Home (matches the old catch-all rewrite)
```

The Admin Panel is unchanged: it is still a modal (`modal.type === 'adminPanel'`), not a route,
so it stays unlinked and unindexed.

## What actually changed

**1. `src/context/AppContext.jsx`** — the only substantially rewritten file. Its *public API is
unchanged* (`activeTab`, `setTab`, `goBack`, `canGoBack`, `deepLinkTestId`, …), which is why no
consuming component needed editing.

* `activeTab` is now **derived** from `usePathname()` instead of its own state seeded from
  `window.location.pathname`. Same tab ids, same `tabForPath()` mapping.
* `setTab` / `goBack` call `router.push()` instead of `window.history.pushState()`. The
  `tabStack` history that powers the in-app Back button is unchanged.
* The manual `popstate` listener was removed — the App Router already keeps `usePathname()` in
  sync with the browser Back/Forward buttons, so keeping it would double-handle navigation.
* `localStorage` reads (`currentUser`, `tce_admin_session_v1`, `tce_theme`) moved out of
  `useState` initializers into a mount effect. Client components are still pre-rendered on the
  server, where `localStorage` doesn't exist; reading it during the initial render would crash
  SSR and cause a hydration mismatch. A `hydrated` flag gates persistence so the server-render
  defaults can never clobber a stored preference.

**2. `src/firebase.js`** — `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*`. Same keys,
same fallback values, same `DEMO_MODE` flag. Firestore collection names, the chunked
read/write scheme in `lib/db.js`, the per-document `tce_submissions` collection and all
security-relevant logic are untouched.

**3. `src/components/exam/ExamRunner.jsx`** — the exam back-button guard now passes the current
URL explicitly to `history.pushState`. Next patches `pushState` to keep its router state in
sync, so passing the same URL makes the guard entry a true no-op navigation and the exam screen
is never torn down mid-test. User-facing behaviour is identical.

**4. Theme boot script** — a small inline script in `layout.js` applies the saved light/dark
class to `<html>` before first paint, so a light-theme user refreshing never sees a dark flash.
`<html>` carries `suppressHydrationWarning` for this reason.

**5. `'use client'`** — added to every component, view, hook, the context, `firebase.js` and
`lib/db.js`. The pure helper modules (`utils`, `routes`, `seedData`, `examEngine`,
`imageUtils`, `watermark`) don't need it; they get pulled into the client bundle through their
importers.

## Deliberately not changed

* No business logic, scoring, leaderboard, exemption or access-control rules were touched.
* No Firestore collection names, document shapes, or security rules were touched.
* No visual changes: Tailwind config, `globals.css`, and every `className` are as they were.
  `next/image` is **not** used anywhere — plain `<img>` tags are kept so rendering is identical.
* `src/lib/storage.js` is kept verbatim. It was already dead code in the Vite build (it imports
  a `fbStorage` export that `firebase.js` intentionally no longer provides — profile photos are
  Base64 in Firestore instead, see `lib/imageUtils.js`). Nothing imports it, so it is never
  bundled. Delete it whenever convenient.

## Known deployment notes

* On Vercel, Next is auto-detected — the old `vercel.json` rewrite block is no longer needed and
  has been removed.
* Unmatched URLs now return an HTTP **404** status while still rendering the homepage. Under the
  old `vercel.json` catch-all they returned 200. This is the more correct behaviour for SEO.
* The admin password is still checked client-side against a constant in
  `AdminLoginModal.jsx` — unchanged by this migration, but see the original security note: this
  is readable in the shipped bundle, and Firestore rules should remain the real access boundary.
