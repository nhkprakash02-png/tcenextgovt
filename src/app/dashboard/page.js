import React from 'react';
import Dashboard from '../../views/Dashboard';

export const metadata = {
  title: 'My Dashboard | TCE Nahata',
  description: 'Your TCE Nahata dashboard: mock test, PYQ and quiz attempt history with detailed per-attempt performance analysis.',
  alternates: { canonical: '/dashboard' },
  // Private, login-required page — already disallowed in robots.js, but an explicit noindex
  // here is the more reliable signal: Disallow only blocks crawling, it doesn't guarantee
  // Google won't index a URL it discovers some other way (e.g. linked from elsewhere). noindex
  // is what actually keeps it out of search results.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Dashboard />;
}
