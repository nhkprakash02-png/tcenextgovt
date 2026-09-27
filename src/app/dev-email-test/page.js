import React from 'react';
import EmailTestClient from '../../components/EmailTestClient';

// Private dev/test utility — not linked from anywhere in navigation and not listed in
// sitemap.js. noindex here is belt-and-suspenders on top of that.
export const metadata = {
  title: 'Email Template Test',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <EmailTestClient />;
    }
