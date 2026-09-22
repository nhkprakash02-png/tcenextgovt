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
  title: 'Mock Test | TCE - The Competitive Edge',
  description: 'Open a TCE mock test directly from a shared link.',
};

export default function Page() {
  return <MockTest />;
}
