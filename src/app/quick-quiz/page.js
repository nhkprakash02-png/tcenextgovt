import React from 'react';
import Quiz from '../../views/Quiz';

const TITLE = 'Free GK & Current Affairs Quiz | TCE Nahata';
const DESCRIPTION = 'Free GK and Current Affairs quiz for WBP, SSC GD, KP SI & Railway aspirants. Pick your question count for a quick, timed practice round — no login needed.';
const URL = 'https://tcenahata.in/quick-quiz';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/quick-quiz' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <Quiz />;
    }
