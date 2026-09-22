'use client';

import React, { useState } from 'react';
import { Trash2, Power } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../lib/utils';

const EMPTY = { text: '', linkUrl: '', buttonLabel: 'Tap Here' };

export default function UrgentNoticesManager() {
  const { DB, saveDB } = useApp();
  const [form, setForm] = useState(EMPTY);

  const addNotice = () => {
    if (!form.text.trim()) { alert('Please enter the notice text.'); return; }
    const notice = { id: uid('un'), text: form.text.trim(), linkUrl: form.linkUrl.trim(), buttonLabel: form.buttonLabel.trim() || 'Tap Here', active: true };
    saveDB((prev) => ({ ...prev, urgentNotices: [...(prev.urgentNotices || []), notice] }));
    setForm(EMPTY);
  };

  const toggleActive = (id) => saveDB((prev) => ({ ...prev, urgentNotices: prev.urgentNotices.map((n) => (n.id === id ? { ...n, active: !n.active } : n)) }));
  const deleteNotice = (id) => {
    if (!confirm('Delete this urgent notice permanently?')) return;
    saveDB((prev) => ({ ...prev, urgentNotices: prev.urgentNotices.filter((n) => n.id !== id) }));
  };

  return (
    <div>
      <p className="text-sm muted mb-4">These show as attention-grabbing cards at the top of the homepage — for time-sensitive things like exam application windows or admit card releases. Turn one off with the power button instead of deleting it if you might reuse it later.</p>

      <div className="card2 rounded-xl p-4 mb-6">
        <p className="text-xs font-bold muted uppercase mb-3">Add New Notice</p>
        <textarea
          value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={2}
          placeholder='Notice text, e.g. "WBP Constable 2026 applications are now open!"'
          className="w-full rounded-lg px-3 py-2 text-xs mb-2"
        />
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          <input
            value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} type="text"
            placeholder="Redirect link (e.g. https://... application/admit-card page)"
            className="rounded-lg px-3 py-2 text-xs"
          />
          <input
            value={form.buttonLabel} onChange={(e) => setForm({ ...form, buttonLabel: e.target.value })} type="text"
            placeholder='Button text (e.g. "Apply Now", "Tap Here")'
            className="rounded-lg px-3 py-2 text-xs"
          />
        </div>
        <button onClick={addNotice} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">+ Add Notice</button>
      </div>

      <p className="text-xs font-bold muted uppercase mb-2">Current Notices ({(DB.urgentNotices || []).length})</p>
      <div className="space-y-2">
        {(DB.urgentNotices || []).length ? DB.urgentNotices.map((n) => (
          <div key={n.id} className="card rounded-lg p-3 flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${n.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 muted'}`}>{n.active ? 'Live on homepage' : 'Hidden'}</span>
              </div>
              <p className="text-xs font-medium">{n.text}</p>
              {n.linkUrl && <p className="text-[10px] muted mt-1 truncate">Button "{n.buttonLabel}" → {n.linkUrl}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleActive(n.id)} className="text-amber-400" title={n.active ? 'Hide from homepage' : 'Show on homepage'}><Power className="w-4 h-4" /></button>
              <button onClick={() => deleteNotice(n.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        )) : <p className="muted text-sm">No urgent notices yet — add one above.</p>}
      </div>
    </div>
  );
}
