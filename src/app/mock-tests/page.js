import React from 'react';
import MockTest from '../../views/MockTest';

export const metadata = {
  title: 'Mock Tests — CBT Engine | TCE - The Competitive Edge',
  description: 'TCS iON / SSC CBT style mock tests for WBP, KP SI, SSC GD and Railway (RRB). Free demo mock in every subject, full series for enrolled batch students.',
  alternates: { canonical: '/mock-tests' },
};

export default function Page() {
  return <MockTest />;
}
