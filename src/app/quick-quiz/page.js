import React from 'react';
import Quiz from '../../views/Quiz';

export const metadata = {
  title: 'Quick Quiz — Free GK & Current Affairs | TCE - The Competitive Edge',
  description: 'Free dynamic GK and Current Affairs quiz. Choose your question count and get an automatically timed practice round — open to all visitors.',
  alternates: { canonical: '/quick-quiz' },
};

export default function Page() {
  return <Quiz />;
}
