'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../lib/utils';

export default function NoticesManager() {
  const { DB, saveDB } = useApp();
  const [title, setTitle] = useState('');

  const addNotice = () => {
    if (!title.trim()) return;
    saveDB((prev) => ({ ...prev, notices: [...prev.notices, { id: uid('nt'), title: title.trim(), date: new Date().toISOString().slice(0, 10), body: '' }] }));
    setTitle('');
  };
  const deleteNotice = (id) => {
    if (!confirm('Delete this notice permanently?')) return;
    saveDB((prev) => ({ ...prev, notices: prev.notices.filter((n) => n.id !== id) }));
  };

  return (
    <div>
      <p className="text-xs font-bold muted uppercase mb-2">Notices</p>
      <div className="flex gap-2 mb-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNotice()} placeholder="Notice title" className="flex-1 rounded-lg px-3 py-2 text-xs" />
        <button onClick={addNotice} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">Add</button>
      </div>
      <div className="space-y-1">
        {DB.notices.map((n) => (
          <div key={n.id} className="flex justify-between items-center text-xs card rounded-md px-2 py-1.5">
            <span>{n.title}</span>
            <button onClick={() => deleteNotice(n.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
