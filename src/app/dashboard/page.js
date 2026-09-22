import React from 'react';
import Dashboard from '../../views/Dashboard';

export const metadata = {
  title: 'My Dashboard | TCE - The Competitive Edge',
  description: 'Your TCE dashboard: mock test, PYQ and quiz attempt history with detailed per-attempt analysis.',
  alternates: { canonical: '/dashboard' },
};

export default function Page() {
  return <Dashboard />;
}
