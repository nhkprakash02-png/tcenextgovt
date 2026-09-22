'use client';

import React from 'react';
import { useApp } from '../context/AppContext';

export default function Ticker() {
  const { DB } = useApp();
  return (
    <div className="gold-grad text-ink text-xs sm:text-sm font-semibold overflow-hidden py-1.5">
      <div className="ticker-track">{DB.ticker || 'Loading announcements...'}</div>
    </div>
  );
}
