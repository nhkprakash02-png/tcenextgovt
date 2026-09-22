'use client';

import React from 'react';

// One consistent avatar everywhere a student appears: their uploaded photo if they have one,
// otherwise the existing gold-circle-with-initial look the site already used. `sizeClass` and
// `textSizeClass` let each call site size it appropriately (dashboard vs. leaderboard vs. a
// small leaderboard-row avatar) without duplicating this fallback logic.
export default function Avatar({ name, photoURL, sizeClass = 'w-14 h-14', textSizeClass = 'text-xl', className = '' }) {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?';
  if (photoURL) {
    return <img src={photoURL} alt={name || 'Student'} className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full gold-grad flex items-center justify-center font-display font-800 text-ink shrink-0 ${textSizeClass} ${className}`}>
      {initial}
    </div>
  );
}
