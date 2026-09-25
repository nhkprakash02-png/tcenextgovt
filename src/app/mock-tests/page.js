import React from 'react';
import MockTest from '../../views/MockTest';

const TITLE = 'Mock Tests for WBP, KP SI, SSC GD, RRB | TCE Nahata';
const DESCRIPTION = 'CBT-style mock tests for WBP, KP SI, SSC GD Constable & Railway (RRB). Free demo in every subject; full test series for enrolled TCE Nahata batches.';
const URL = 'https://tcenahata.in/mock-tests';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/mock-tests' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <MockTest />;
    }
