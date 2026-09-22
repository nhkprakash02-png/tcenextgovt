'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function HeroCarousel() {
  const { banners, setTab } = useApp();
  const [idx, setIdx] = useState(0);
  const touchStart = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners, idx]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (banners.length < 2) return undefined;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touchStart.current || !banners.length) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    if (Math.abs(dx) > 40) {
      setIdx((i) => (dx < 0 ? (i + 1) % banners.length : (i - 1 + banners.length) % banners.length));
    }
    touchStart.current = null;
  };

  if (!banners.length) {
    return (
      <section className="relative">
        <div className="relative h-[340px] sm:h-[420px] overflow-hidden">
          <div className="absolute inset-0 gold-grad flex items-center">
            <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full">
              <h1 className="font-display font-800 text-2xl sm:text-4xl text-black">TCE - The Competitive Edge</h1>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative">
      <div className="relative h-[340px] sm:h-[420px] overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {banners.map((b, i) => (
          <div key={b.id || i} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div
              className={`w-full h-full ${b.image ? '' : 'bg-gradient-to-br ' + (b.grad || 'from-amber-600 via-yellow-500 to-orange-600')} flex items-end relative overflow-hidden`}
              style={b.image ? { background: 'var(--panel)' } : undefined}
            >
              {b.image && (
                <>
                  <img src={b.image} alt={b.title || 'Banner'} className="absolute inset-0 w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/40" />
                </>
              )}
              <div className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10 pb-10 sm:pb-14">
                {b.tag && <span className="badge bg-black/30 text-white inline-block mb-3">{b.tag}</span>}
                <h1 className={`font-display font-800 text-3xl sm:text-5xl ${b.image ? 'text-white' : 'text-black'} max-w-xl leading-tight`}>{b.title}</h1>
                <p className={`${b.image ? 'text-white/85' : 'text-black/80'} mt-3 max-w-md text-sm sm:text-base font-medium`}>{b.subtitle}</p>
                <div className="flex gap-3 mt-6">
                  {b.link ? (
                    <a href={b.link} target="_blank" rel="noreferrer" className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-bold">Learn More</a>
                  ) : (
                    <button onClick={() => setTab('batches')} className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-bold">Enroll Now</button>
                  )}
                  <button onClick={() => setTab('mocks')} className="px-5 py-2.5 rounded-lg bg-white/90 text-black text-sm font-bold">Try Free Mock</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
        {banners.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
        ))}
      </div>
    </section>
  );
}
