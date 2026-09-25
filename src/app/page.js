import React from 'react';
import Home from '../views/Home';

const TITLE = 'TCE Nahata - The Competitive Edge | Mock Tests & Coaching';
const DESCRIPTION = 'TCE Nahata coaching for WBP, KP SI, SSC GD & Railway (RRB) exams in North 24 Parganas, West Bengal. Free mock tests, PYQs, quizzes & study materials.';
const URL = 'https://tcenahata.in/';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

// Structured data (JSON-LD) so Google understands this is a coaching institute, not a generic
// website — can surface richer results (site name, logo) in search. EducationalOrganization is
// the correct schema.org type for a coaching/exam-prep institute; render as a plain <script> tag
// since Next's metadata API has no dedicated JSON-LD field.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'TCE - The Competitive Edge',
  alternateName: 'TCE Nahata',
  url: URL,
  logo: 'https://tcenahata.in/logo.png',
  image: 'https://tcenahata.in/seo-banner.png',
  description: DESCRIPTION,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Nahata',
    addressRegion: 'West Bengal',
    addressCountry: 'IN',
  },
  areaServed: 'North 24 Parganas, West Bengal',
  sameAs: [],
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Home />
    </>
  );
}
