import React from 'react';
import Home from '../views/Home';

// Under Vite, vercel.json rewrote every unmatched path to index.html and lib/routes.js
// tabForPath() fell back to the 'home' tab — so an unknown URL simply showed the homepage.
// This preserves that experience: unmatched routes still render Home inside the normal shell
// (and since tabForPath() returns 'home' for them, the hero carousel and Mentors section
// appear too, exactly as before). The one difference is that Next correctly serves these with
// an HTTP 404 status instead of a 200, which is better for SEO.
export const metadata = {
  title: 'TCE Nahata - The Competitive Edge | Mock Tests & Coaching',
};

export default function NotFound() {
  return <Home />;
}
