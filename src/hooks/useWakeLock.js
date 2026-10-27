'use client';

import { useEffect } from 'react';

// Keeps the screen awake while `active` is true (used during every mock test). Uses the browser's
// Screen Wake Lock API. Browsers drop the lock whenever the page goes to the background, so it is
// requested again automatically when the student comes back. If the browser doesn't support it,
// or refuses (e.g. battery saver), nothing happens and the exam works exactly as before.
export default function useWakeLock(active = true) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined;
    let lock = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (cancelled || document.visibilityState !== 'visible') return;
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      } catch (e) { /* not allowed right now — ignore */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible' && !lock) acquire(); };

    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) { lock.release().catch(() => {}); lock = null; }
    };
  }, [active]);
}
