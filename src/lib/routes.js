// Lightweight URL routing — no react-router dependency, just the browser History API. Added
// specifically so each main section has a real, distinct, indexable URL (previously everything
// lived at "/" and sections were only switched by JS state, which is invisible to Google and
// meant a sitemap listing separate section URLs would have been pointing at pages that don't
// actually exist).
export const PATH_FOR_TAB = {
  home: '/',
  mocks: '/mock-tests',
  quiz: '/quick-quiz',
  pyq: '/pyq-hub',
  materials: '/study-materials',
  batches: '/batches-fees',
  dashboard: '/dashboard',
  notices: '/notices-contact',
};

const TAB_FOR_PATH = Object.fromEntries(Object.entries(PATH_FOR_TAB).map(([tab, path]) => [path, tab]));

export function tabForPath(pathname) {
  if (/^\/test\/[^/]+\/?$/.test(pathname)) return 'mocks';
  return TAB_FOR_PATH[pathname] || 'home';
}

// Deep link for a single mock test, e.g. /test/mt_abc123 — used by the "Copy Link"/"Share to
// WhatsApp" menu on each mock test card. Kept separate from the static PATH_FOR_TAB map above
// since it's a pattern (one path per test) rather than a fixed one-per-section path.
export function testDeepLinkPath(testId) {
  return `/test/${encodeURIComponent(testId)}`;
}

// Returns the testId if `pathname` is a /test/:id deep link, otherwise null.
export function parseTestDeepLink(pathname) {
  const m = /^\/test\/([^/]+)\/?$/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}
