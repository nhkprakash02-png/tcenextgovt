import React from 'react';
import StudyMaterials from '../../views/StudyMaterials';

export const metadata = {
  title: 'Study Materials | TCE - The Competitive Edge',
  description: 'Watermarked PDF study materials for Math, English, Reasoning, GK, Science and Current Affairs, licensed to each student automatically.',
  alternates: { canonical: '/study-materials' },
};

export default function Page() {
  return <StudyMaterials />;
}
