'use client';

import React from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

// Wraps modal body content in the same card/glow-border chrome the original used for every
// modal (login, enroll, admin login, etc. — see index.html openModal()), with a close button
// and backdrop click-to-close. Also locks page scroll behind it while open (any Modal instance
// being mounted means it's open, so lock unconditionally for the component's lifetime).
export default function Modal({ title, onClose, children, wide }) {
  const { closeModal } = useApp();
  const handleClose = onClose || closeModal;
  useLockBodyScroll(true);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`card glow-border rounded-2xl p-6 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-700 text-lg">{title}</h3>
            <button onClick={handleClose} aria-label="Close"><X className="w-5 h-5" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
