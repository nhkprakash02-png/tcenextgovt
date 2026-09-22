'use client';

import React from 'react';
import { Megaphone, ArrowUpRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

// Shown on the homepage only, above the batches section — for time-sensitive things like
// "Applications open for WBP Constable 2026" or "Admit cards released" with a direct link out.
// Admin controls the text/link/button label from the "Urgent Notices" admin tab; a notice with
// `active: false` is kept in the database but hidden here, so old ones can be toggled off
// without losing the text if they need to be reused later.
export default function UrgentNotices() {
  const { DB } = useApp();
  const active = (DB.urgentNotices || []).filter((n) => n.active);
  if (!active.length) return null;

  return (
    <div className={`grid gap-4 mb-10 ${active.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
      {active.map((n) => (
          <div key={n.id} className="card glow-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: 'rgba(245,158,11,0.6)' }}>
            <div className="w-10 h-10 rounded-full gold-grad flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-ink" />
            </div>
            <p className="text-sm font-semibold flex-1">{n.text}</p>
            {n.linkUrl && (
              <a
                href={n.linkUrl} target="_blank" rel="noreferrer"
                className="btn-gold rounded-lg px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                {n.buttonLabel || 'Tap Here'} <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
    </div>
  );
}
