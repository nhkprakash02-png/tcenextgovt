'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Shown on every page except Home. Deliberately placed bottom-left (mirroring the existing
// WhatsApp/Install buttons at bottom-right) so it never overlaps page content, navbar, or the
// question palette on exam-review screens — and it's `fixed`, so it works the same in portrait,
// landscape, and installed-PWA mode. It renders at a lower z-index than the full-screen exam
// screens (ExamRunner/ExamInstructions/ResultScreen/ReviewScreen all use z-50), so it's
// automatically covered and unclickable during an actual running test, without needing any
// extra logic here — exactly the "no back button during the test itself" behavior requested.
export default function BackButton() {
  const { activeTab, goBack } = useApp();
  if (activeTab === 'home') return null;
  return (
    <button
      onClick={goBack}
      className="fixed bottom-5 left-5 z-40 flex items-center gap-1.5 px-4 py-3 rounded-full btn-ghost shadow-lg text-xs font-bold"
      style={{ background: 'var(--panel)' }}
      title="Back"
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );
}
