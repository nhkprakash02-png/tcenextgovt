'use client';

import { useEffect } from 'react';

// Prevents the page behind a full-screen overlay (mobile nav drawer, modals, the Admin Login
// popup, exam screens, etc.) from scrolling while that overlay is open. Sets
// document.body.style.overflow = 'hidden' the moment a lock is requested, and resets it to
// 'auto' once nothing needs it locked anymore.
//
// Uses a shared reference count (moduleLockCount) rather than each caller blindly restoring
// whatever value it saw when it mounted — that naive approach breaks the moment two lockers are
// ever active at once (e.g. opening one modal from inside another): whichever one happens to
// unmount first would incorrectly unlock scrolling while the other is still supposed to be
// holding the lock, or restore a stale value. Counting active locks means the body only ever
// becomes scrollable again once the LAST lock has released, no matter the mount/unmount order.
let moduleLockCount = 0;
function applyLock() {
  moduleLockCount += 1;
  document.body.style.overflow = 'hidden';
}
function releaseLock() {
  moduleLockCount = Math.max(0, moduleLockCount - 1);
  if (moduleLockCount === 0) document.body.style.overflow = 'auto';
}

export default function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    applyLock();
    return releaseLock;
  }, [locked]);
}
