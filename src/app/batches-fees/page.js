import React from 'react';
import Batches from '../../views/Batches';

const TITLE = 'Batches & Fees | TCE Nahata Coaching';
const DESCRIPTION = 'TCE Nahata coaching batches for WBP, KP SI, SSC GD Constable & Railway (RRB) exams near Nahata, North 24 Parganas. Enroll instantly online.';
const URL = 'https://tcenahata.in/batches-fees';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/batches-fees' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <Batches />;
    }
