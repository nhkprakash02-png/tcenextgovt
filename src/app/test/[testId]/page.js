import React from 'react';
import MockTest from '../../../views/MockTest';

// Deep link for a single mock test, e.g. /test/mt_abc123 — produced by the "Copy Link" /
// "Share to WhatsApp" menu on each mock test card (see lib/routes.js testDeepLinkPath).
//
// Under Vite this path was matched by a regex inside the client-side router; under the App
// Router it is a real dynamic route, but it deliberately renders the very same MockTest view.
// AppContext parses the testId out of the pathname into `deepLinkTestId`, and MockTest's
// existing effect picks it up to switch to the right subject tab and auto-launch the test —
// that logic is untouched.
export const metadata = {
  title: 'Shared Mock Test | TCE Nahata',
  description: 'Open this shared TCE Nahata mock test directly and start practicing for WBP, KP SI, SSC GD or Railway (RRB) exams.',
  openGraph: {
    type: 'website',
    title: 'Shared Mock Test | TCE Nahata',
    description: 'Open this shared TCE Nahata mock test directly and start practicing for WBP, KP SI, SSC GD or Railway (RRB) exams.',
    images: [{ url: '/seo-banner.png', width: 647, height: 423 }],
  },
  twitter: { card: 'summary_large_image', title: 'Shared Mock Test | TCE Nahata', images: ['/seo-banner.png'] },
  // noindex, but still follow: these are meant to be opened via a direct WhatsApp/social share
  // link (so the OG tags above still need to render a nice preview), but there can be hundreds
  // of them — one per mock test — and they show the exact same content as /mock-tests with one
  // test pre-selected. Letting Google index all of them individually would just create
  // duplicate-content noise competing with the real hub page, so they're excluded from search
  // results specifically, not from being followed/shared.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <MockTest />;
}
