'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const MENTOR_PHOTO_OVERRIDE = {
  'Tanujoy Mallick': 'tanujoy.png', 'Prakash Sarkar': 'prakash.png',
  'Maharup Tarafder': 'maharup.png', 'Pranab Sadhukhan': 'pranab.png',
};

export default function Mentors() {
  const { DB } = useApp();
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-8">
        <p className="text-xs tracking-widest muted uppercase mb-1">Meet the team</p>
        <h2 className="font-display font-800 text-2xl sm:text-3xl">Our <span className="gold-text">Expert Mentors</span></h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
        {DB.mentors.map((m) => {
          const photoSrc = MENTOR_PHOTO_OVERRIDE[m.name] || m.photo;
          const initials = m.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
          return (
            <div key={m.id} className="card glow-border rounded-2xl pt-0 pb-5 px-5 text-center">
              <div className="relative -mt-8 mb-3 flex justify-center">
                {photoSrc ? (
                  <img src={`/${photoSrc}`} className="w-16 h-16 rounded-full object-cover ring-4 shadow-lg" style={{ '--tw-ring-color': 'var(--bg)' }} alt={m.name} />
                ) : (
                  <div className="w-16 h-16 rounded-full gold-grad flex items-center justify-center font-display font-800 text-ink text-xl ring-4 shadow-lg" style={{ '--tw-ring-color': 'var(--bg)' }}>{initials}</div>
                )}
              </div>
              <h3 className="font-display font-700 text-sm">{m.name}</h3>
              <p className="text-xs gold-text font-semibold mt-0.5">Tutor &amp; Mentor</p>
              <p className="text-xs muted mt-1">{m.subject}</p>
              <a
                href={`https://wa.me/${m.phone}?text=Hello%20${encodeURIComponent(m.name)}%2C%20I%20want%20to%20know%20more%20about%20TCE%20classes`}
                target="_blank" rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
