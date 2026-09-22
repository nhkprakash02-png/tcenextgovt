'use client';

import React from 'react';
import { FileCheck2, Zap, Archive, BookOpen, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { batchFeaturesList } from '../lib/utils';
import PriceTag from '../components/PriceTag';
import UrgentNotices from '../components/UrgentNotices';
import HomeLeaderboard from '../components/HomeLeaderboard';

const QUICK_LINKS = [
  { icon: FileCheck2, label: 'Mock Tests', val: 'Paid / Enrolled', tab: 'mocks' },
  { icon: Zap, label: 'Quick Quiz', val: 'Free — GK Only', tab: 'quiz' },
  { icon: Archive, label: 'PYQ Hub', val: '100% Free', tab: 'pyq' },
  { icon: BookOpen, label: 'Study Material', val: '100% Free', tab: 'materials' },
];

function BatchSkeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="card glow-border rounded-2xl p-5 animate-pulse">
          <div className="h-6 w-2/3 rounded bg-white/10 mb-3" />
          <div className="h-5 w-1/3 rounded bg-white/10 mb-4" />
          <div className="h-3 w-full rounded bg-white/10 mb-2" />
          <div className="h-3 w-4/5 rounded bg-white/10 mb-6" />
          <div className="h-9 w-full rounded-lg bg-white/10" />
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const { DB, dbLoading, setTab, openModal } = useApp();
  const activeBatches = DB.batches.filter((b) => b.active);

  return (
    <div>
      <HomeLeaderboard />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {QUICK_LINKS.map((c) => (
          <button key={c.tab} onClick={() => setTab(c.tab)} className="card glow-border rounded-2xl p-4 text-left">
            <div className="w-9 h-9 rounded-lg gold-grad flex items-center justify-center mb-3"><c.icon className="w-4 h-4 text-ink" /></div>
            <p className="text-xs muted">{c.label}</p>
            <p className="font-display font-700 text-sm mt-0.5">{c.val}</p>
          </button>
        ))}
      </div>

      <div className="mb-10">
        <h3 className="font-display font-700 text-lg mb-3">Our Batches</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {dbLoading ? (
            <BatchSkeleton />
          ) : activeBatches.length ? (
            activeBatches.map((b) => (
              <div key={b.id} className="card glow-border rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-display font-800 text-xl sm:text-2xl leading-tight break-words">{b.name}</h4>
                  {b.examCategory && b.examCategory !== 'All Exams' && (
                    <span className="badge bg-sky-500/15 text-sky-400 shrink-0">{b.examCategory}</span>
                  )}
                </div>
                <div className="mb-3">
                  <PriceTag price={b.price} originalPrice={b.originalPrice} size="lg" theme="dark" />
                </div>
                <ul className="text-xs muted space-y-1 mb-4">
                  {batchFeaturesList(b).slice(0, 3).map((f) => (
                    <li key={f} className="flex gap-1.5 items-center"><Check className="w-3 h-3 gold-text" />{f}</li>
                  ))}
                </ul>
                <button onClick={() => openModal('enroll', { context: 'batch', batchId: b.id })} className="mt-auto btn-gold rounded-lg py-2 text-xs font-bold">Enroll Now</button>
              </div>
            ))
          ) : (
            <p className="muted text-sm col-span-full">No active batches available right now.</p>
          )}
        </div>
      </div>

      <UrgentNotices />

      <div className="mb-4">
        <h3 className="font-display font-700 text-lg mb-3">Latest Notices</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {DB.notices.slice(0, 3).map((n) => (
            <div key={n.id} className="card glow-border rounded-xl p-4">
              <p className="text-[10px] muted">{n.date}</p>
              <p className="font-semibold text-sm mt-1">{n.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
