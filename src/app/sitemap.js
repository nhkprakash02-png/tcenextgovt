// Next.js App Router's native sitemap: this file, at src/app/sitemap.js, is automatically
// served at /sitemap.xml with correct XML and headers — no manual XML needed. Replaces the
// static public/sitemap.xml (deleted alongside this file; Next.js build fails if a static file
// and a generated route both resolve to the same path).
//
// Lists every real, public, indexable page in the app — matching PATH_FOR_TAB in lib/routes.js
// exactly. Two kinds of route are deliberately left OUT, matching standard SEO practice:
//   - /dashboard: private, login-required, already disallowed in robots.js below.
//   - /test/[testId]: per-mock share/deep-links. These render the exact same content as
//     /mock-tests (just pre-selecting one test), so including potentially hundreds of these in
//     the sitemap would create thin/duplicate-content signals that dilute the real page's
//     ranking rather than helping it. They still work fine as direct WhatsApp/social share
//     links — they're just not something Google should be told to crawl and index on its own.
export default function sitemap() {
  const SITE = 'https://tcenahata.in';
  const now = new Date();

  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/mock-tests`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/pyq-hub`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/quick-quiz`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/study-materials`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/batches-fees`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/notices-contact`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
}
