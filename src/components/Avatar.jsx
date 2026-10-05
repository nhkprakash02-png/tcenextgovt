'use client';

import React, { useEffect, useState } from 'react';

// One consistent avatar everywhere a student appears: their uploaded photo if they have one,
// otherwise the existing gold-circle-with-initial look the site already used. `sizeClass` and
// `textSizeClass` let each call site size it appropriately (dashboard vs. leaderboard vs. a
// small leaderboard-row avatar) without duplicating this fallback logic.
//
// `photoURL` is whatever is saved on the student record: a manually uploaded photo (Base64) if
// they uploaded one — that always replaces the Google picture — otherwise the Google profile
// picture saved at "Continue with Google" login, otherwise empty (initial letter shown).
//
// FIX: Google profile pictures (lh3.googleusercontent.com) are frequently refused when the
// request carries this site's referrer, so referrerPolicy="no-referrer" is required for them to
// load reliably. And if any photo still fails to load (expired link, offline), the initial-letter
// avatar is shown instead of a broken-image icon.
export default function Avatar({ name, photoURL, sizeClass = 'w-14 h-14', textSizeClass = 'text-xl', className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [photoURL]);
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  if (photoURL && !failed) {
    return (
      <img
        src={photoURL}
        alt={name || 'Student'}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full gold-grad flex items-center justify-center font-display font-800 text-ink shrink-0 ${textSizeClass} ${className}`}>
      {initial}
    </div>
  );
}
