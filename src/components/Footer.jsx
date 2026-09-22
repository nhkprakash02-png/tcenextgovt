'use client';

import React from 'react';
import { Globe, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TABS } from '../lib/utils';

export default function Footer() {
  const { setTab, openModal } = useApp();
  return (
    <footer className="mt-10" style={{ borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg gold-grad flex items-center justify-center font-display font-800 text-ink">T</div>
            <span className="font-display font-800">TCE - The Competitive Edge</span>
          </div>
          <p className="muted text-sm">Premier coaching institute for WBP, KP SI, SSC GD Constable, Railway (RRB) and other competitive government exams.</p>
          <p className="text-xs gold-text font-semibold mt-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Tcenahata.in</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide muted">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="text-left muted hover:text-current text-sm">{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide muted">Faculty Contact</h4>
          <div className="flex flex-col gap-3 text-sm">
            <a href="https://wa.me/919749587349?text=Hello%20Sir%2C%20I%20want%20to%20know%20more%20about%20TCE%20classes" target="_blank" rel="noreferrer" className="flex items-center gap-2 muted hover:text-current">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              <span>Tanujoy Mallick <span className="block text-xs">+91 97495 87349</span></span>
            </a>
            <a href="https://wa.me/917384644030?text=Hello%20Sir%2C%20I%20want%20to%20know%20more%20about%20TCE%20classes" target="_blank" rel="noreferrer" className="flex items-center gap-2 muted hover:text-current">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              <span>Prakash Sarkar <span className="block text-xs">+91 73846 44030</span></span>
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide muted">Contact</h4>
          <p className="text-sm gold-text font-semibold flex items-center gap-2 mb-2"><Globe className="w-3.5 h-3.5" /> Tcenahata.in</p>
          <p className="text-sm muted flex items-start gap-2 mb-2"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Near Nahata Anchal, Nahata, P.S. Gopalnagar, North 24 Parganas, West Bengal, PIN - 743290</p>
          <p className="text-sm muted flex items-center gap-2 mb-2"><Phone className="w-3.5 h-3.5" /> +91 73846 44030</p>
          <p className="text-sm muted flex items-center gap-2 mb-2"><Mail className="w-3.5 h-3.5" /> tcenahata@gmail.com</p>
          <iframe
            title="TCE location on Google Maps"
            src={`https://www.google.com/maps?q=${encodeURIComponent('XPV4+7H Gopalnagar, Khamarkalla, West Bengal')}&output=embed`}
            className="w-full h-40 sm:h-44 rounded-lg mt-1 mb-3"
            style={{ border: '1px solid var(--border)' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <button onClick={() => openModal('adminLogin')} className="text-xs muted underline">Admin Login</button>
        </div>
      </div>
      <div className="text-center text-xs muted pb-6">© 2026 TCE - The Competitive Edge. All rights reserved.</div>
    </footer>
  );
}
