import React from 'react';
import Batches from '../../views/Batches';

export const metadata = {
  title: 'Batches & Fees — Direct Enrollment | TCE - The Competitive Edge',
  description: 'Browse TCE batches for WBP, KP SI, SSC GD and Railway (RRB), and enroll instantly via UPI.',
  alternates: { canonical: '/batches-fees' },
};

export default function Page() {
  return <Batches />;
}
