import React from 'react';
import Notices from '../../views/Notices';

const TITLE = 'Notices & Contact | TCE Nahata Coaching';
const DESCRIPTION = 'Latest notices, institute address near Nahata, North 24 Parganas, faculty contacts & admission enquiry form for TCE - The Competitive Edge.';
const URL = 'https://tcenahata.in/notices-contact';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/notices-contact' },
  openGraph: { type: 'website', url: URL, title: TITLE, description: DESCRIPTION, images: [{ url: '/seo-banner.png', width: 647, height: 423 }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/seo-banner.png'] },
};

export default function Page() {
  return <Notices />;
}
