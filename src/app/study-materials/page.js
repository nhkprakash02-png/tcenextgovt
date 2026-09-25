import React from 'react';
import StudyMaterials from '../../views/StudyMaterials';

const TITLE = 'Study Materials - PDF Notes | TCE Nahata';
const DESCRIPTION = 'Watermarked PDF study materials for Math, English, Reasoning, GK, Science & Current Affairs for WBP, KP SI, SSC GD & RRB aspirants.';
const URL = 'https://tcenahata.in/study-materials';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/study-materials' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <StudyMaterials />;
    }
