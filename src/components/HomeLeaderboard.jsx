'use client';

import React, { useMemo, useState } from 'react';
import { Crown, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeHomeLeaderboard } from '../lib/examEngine';
import Avatar from './Avatar';

const CONTAINER_HEIGHT = 220; // px — total chart height, bars + headroom for avatar/crown
const MIN_BAR_PX = 46;
const MAX_BAR_PX = 128; // leaves headroom above the tallest bar for the (now larger) avatar + crown

const RANK_STYLE = [
  { crown: '#FBBF24', bar: 'linear-gradient(180deg, #FBBF24, #D97706)' }, // gold
  { crown: '#CBD5E1', bar: 'linear-gradient(180deg, #E2E8F0, #94A3B8)' }, // silver
  { crown: '#C87F3B', bar: 'linear-gradient(180deg, #D89A63, #92542A)' }, // bronze
  { crown: '#94A3B8', bar: 'linear-gradient(180deg, #64748B, #475569)' }, // 4th
  { crown: '#94A3B8', bar: 'linear-gradient(180deg, #64748B, #475569)' }, // 5th
];

export default function HomeLeaderboard() {
  const { DB } = useApp();
  const [period, setPeriod] = useState('weekly');

  const top5 = useMemo(() => computeHomeLeaderboard(DB, period), [DB, period]);
  const maxAvg = top5.length ? top5[0].avgPct : 100;

  const photoFor = (studentId) => (DB.students.find((s) => s.id === studentId) || {}).photoURL || '';

  if (!top5.length) return null; // nothing to show yet — don't clutter the homepage with an empty chart

  return (
    <div className="mb-10 card glow-border rounded-2xl p-4 sm:p-7 overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div className="min-w-0">
          <h3 className="font-display font-800 text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 gold-text shrink-0" />Top 5 Leaderboard</h3>
          <p className="text-xs muted mt-0.5">Ranked by average score on paid mock tests</p>
        </div>
        <div className="flex items-center card2 rounded-full p-1 text-xs font-bold shrink-0">
          <button onClick={() => setPeriod('weekly')} className={`px-4 py-1.5 rounded-full transition-colors ${period === 'weekly' ? 'tab-active' : 'muted'}`}>Weekly</button>
          <button onClick={() => setPeriod('monthly')} className={`px-4 py-1.5 rounded-full transition-colors ${period === 'monthly' ? 'tab-active' : 'muted'}`}>Monthly</button>
        </div>
      </div>

      <div className="flex items-end divide-x" style={{ height: CONTAINER_HEIGHT, borderColor: 'var(--border)' }}>
        {top5.map((s, i) => {
          const barPx = Math.round(MIN_BAR_PX + (MAX_BAR_PX - MIN_BAR_PX) * (maxAvg > 0 ? s.avgPct / maxAvg : 0));
          const style = RANK_STYLE[i] || RANK_STYLE[4];
          return (
            <div key={s.studentId} className="flex-1 min-w-0 relative h-full" style={{ borderColor: 'var(--border)' }}>
              {/* Avatar + tilted crown, always sitting right on top of this bar regardless of its height */}
              <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: barPx }}>
                <div className="relative pt-4">
                  <Crown
                    className="absolute -top-1.5 -right-2.5 w-8 h-8 sm:w-9 sm:h-9"
                    style={{ color: style.crown, transform: 'rotate(30deg)', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
                    fill={style.crown}
                  />
                  <Avatar name={s.studentName} photoURL={photoFor(s.studentId)} sizeClass="w-10 h-10 sm:w-12 sm:h-12" textSizeClass="text-sm sm:text-base" className="ring-2" />
                </div>
              </div>
              {/* Bar */}
              <div className="absolute bottom-0 left-0 right-0 mx-1 rounded-t-lg" style={{ height: barPx, background: style.bar }} />
            </div>
          );
        })}
      </div>

      <div className="flex divide-x mt-3" style={{ borderColor: 'var(--border)' }}>
        {top5.map((s) => (
          <div key={s.studentId} className="flex-1 min-w-0 text-center px-0.5 sm:px-1">
            <p className="text-[10px] sm:text-xs font-semibold truncate" title={s.studentName}>{s.studentName}</p>
            <p className="text-[10px] sm:text-xs gold-text font-bold whitespace-nowrap">{s.avgPct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

