'use client';

import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { findPendingOmrAction } from '../lib/omrSession';

// Renders nothing. While an Offline / OMR pre-exam timer is counting down (or an OMR exam is
// running but its screen was lost, e.g. the app was reopened), this watches in the background and
// brings the student back to Mock Tests the moment the exam should start / continue — wherever
// they are in the app. It never interrupts an exam that is already on screen.
export default function OmrAutoStart() {
  const { user, activeTab, setTab, examInProgress } = useApp();
  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) return undefined;
    const id = setInterval(() => {
      if (activeTab === 'mocks' || examInProgress) return; // the Mock Tests page handles it itself
      if (findPendingOmrAction(userId)) setTab('mocks');
    }, 1000);
    return () => clearInterval(id);
  }, [userId, activeTab, examInProgress, setTab]);

  return null;
}
