import React from 'react';
import PyqHub from '../../views/PyqHub';

const TITLE = 'PYQ Hub - Previous Year Papers | TCE Nahata';
const DESCRIPTION = 'Practice real previous year question papers for WBP, KP SI, SSC GD Constable & Railway (RRB) exams. 100% free, no enrollment required.';
const URL = 'https://tcenahata.in/pyq-hub';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pyq-hub' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <PyqHub />;
    }
