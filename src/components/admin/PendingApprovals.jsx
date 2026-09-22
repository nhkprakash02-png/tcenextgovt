'use client';

import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { timeAgo, isExemptEmail } from '../../lib/utils';

export default function PendingApprovals() {
  const { DB, saveDB } = useApp();

  // Mirrors purgeExpiredPendingSignups(): unapproved sign-ups older than 24h are auto-removed.
  useEffect(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const before = DB.students.length;
    const students = DB.students.filter((s) => !(s.pendingReview && s.registeredAt && new Date(s.registeredAt).getTime() < cutoff));
    if (students.length !== before) saveDB((prev) => ({ ...prev, students }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = DB.students.filter((s) => s.pendingReview && !isExemptEmail(s.email)).sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

  const approveSignup = (id) => saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === id ? { ...s, pendingReview: false } : s)) }));
  const deleteStudent = (id) => {
    if (!confirm('Are you sure you want to delete this student record? This cannot be undone.')) return;
    saveDB((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== id) }));
  };

  return (
    <div>
      <p className="text-sm muted mb-4">{pending.length} new sign-up{pending.length === 1 ? '' : 's'} awaiting review. Unapproved sign-ups are automatically removed 24 hours after registration if left untouched.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="card2"><tr className="text-left muted"><th className="p-2">#</th><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Email</th><th className="p-2">Registered</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {pending.length ? pending.map((s, i) => (
              <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-2">{i + 1}</td><td className="p-2">{s.name}</td><td className="p-2">{s.phone || '-'}</td><td className="p-2">{s.email || '-'}</td><td className="p-2">{timeAgo(s.registeredAt)}</td>
                <td className="p-2 flex gap-1">
                  <button onClick={() => approveSignup(s.id)} className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold">Grant</button>
                  <button onClick={() => deleteStudent(s.id)} className="px-2 py-1 rounded bg-gray-600 text-white text-[10px] font-bold flex items-center gap-0.5"><Trash2 className="w-3 h-3" />Delete</button>
                </td>
              </tr>
            )) : <tr><td className="p-2 muted" colSpan={6}>No pending sign-ups right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
