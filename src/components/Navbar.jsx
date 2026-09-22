'use client';

import React, { useState } from 'react';
import { SunMoon, User, UserCheck, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TABS } from '../lib/utils';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

export default function Navbar() {
  const { activeTab, setTab, user, toggleTheme, openModal } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  useLockBodyScroll(mobileOpen);

  const goTab = (id) => { setTab(id); setMobileOpen(false); };

  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => goTab('home')} className="flex items-center gap-2 shrink-0 min-w-0">
            {logoError ? (
              <div className="w-9 h-9 rounded-full gold-grad flex items-center justify-center font-display font-800 text-ink text-lg shrink-0">T</div>
            ) : (
              <img src="/logo.png" alt="TCE logo" onError={() => setLogoError(true)} className="w-9 h-9 rounded-full object-cover shrink-0" />
            )}
            <div className="min-w-0 text-left">
              <div className="font-display font-800 leading-tight text-xs sm:text-base truncate">TCE <span className="gold-text">The Competitive Edge</span></div>
              <div className="text-[9px] sm:text-[10px] muted hidden md:block whitespace-nowrap">Tcenahata.in — Target Your Dream Govt Job</div>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center overflow-x-auto hide-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === t.id ? 'tab-active' : 'muted hover:text-current'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto xl:ml-0">
            <button onClick={toggleTheme} title="Toggle theme" className="w-9 h-9 rounded-full btn-ghost flex items-center justify-center shrink-0">
              <SunMoon className="w-4 h-4" />
            </button>
            <button onClick={() => openModal('login')} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg btn-gold text-xs shrink-0 whitespace-nowrap">
              {user ? <UserCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              {user ? user.name.split(' ')[0] : 'Student Login'}
            </button>
            <button onClick={() => setMobileOpen((v) => !v)} className="xl:hidden w-9 h-9 rounded-full btn-ghost flex items-center justify-center shrink-0">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="xl:hidden px-4 pb-3 flex flex-col gap-1 relative z-[61]" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            {TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => goTab(t.id)}
                className={`menu-item-anim px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 text-left ${activeTab === t.id ? 'tab-active' : 'muted'}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => { openModal('login'); setMobileOpen(false); }}
              className="mt-2 px-3 py-2.5 rounded-lg text-sm font-semibold btn-gold flex items-center gap-2"
            >
              <User className="w-4 h-4" /> {user ? user.name : 'Student Login'}
            </button>
          </div>
        )}
      </header>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="xl:hidden fixed inset-0 z-30 modal-backdrop" />
      )}
    </>
  );
}
