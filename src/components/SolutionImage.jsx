'use client';

import React, { useEffect, useState } from 'react';
import { isSolutionImageRef, loadSolutionImage } from '../lib/questionImageUpload';

// Shows a question's solution photo. `src` is whatever is stored in the question's
// `solutionImg`: either an old-style link/Base64 (shown straight away) or an "fsimg:<id>"
// reference that is fetched from Firestore only now, when this is actually on screen.
export default function SolutionImage({ src, alt = 'Solution', className = '', style }) {
  const [resolved, setResolved] = useState(() => (isSolutionImageRef(src) ? '' : src || ''));
  const [status, setStatus] = useState(isSolutionImageRef(src) ? 'loading' : 'ok');

  useEffect(() => {
    let cancelled = false;
    if (!isSolutionImageRef(src)) { setResolved(src || ''); setStatus('ok'); return undefined; }
    setStatus('loading');
    loadSolutionImage(src)
      .then((url) => { if (!cancelled) { setResolved(url); setStatus('ok'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [src]);

  if (status === 'ok' && resolved) return <img src={resolved} alt={alt} className={className} style={style} />;
  return (
    <div className={`${className} overflow-hidden muted text-[10px] flex items-center justify-center`} style={style} title={status === 'error' ? 'Solution photo could not be loaded' : 'Loading photo…'}>
      {status === 'error' ? '!' : '…'}
    </div>
  );
}
