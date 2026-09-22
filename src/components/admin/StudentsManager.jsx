'use client';

import React, { useState } from 'react';
import { UserPlus, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { uid, isExemptEmail } from '../../lib/utils';

const EMPTY = { name: '', phone: '', email: '', address: '', status: 'Approved', batch: '' };

export default function StudentsManager() {
  const { DB, saveDB } = useApp();
  const [form, setForm] = useState(() => ({ ...EMPTY, batch: DB.batches[0]?.name || '' }));
  // Exempt mentor/admin accounts (see EXEMPT_ADMIN_EMAILS) are intentionally left out of this
  // list — they're not real students and shouldn't show up for manual review/approval here.
  const listed = DB.students.filter((s) => !s.pendingReview && !isExemptEmail(s.email));

  const addStudentManually = () => {
    const { name, phone, email, address, status, batch } = form;
    if (!name.trim() || (!phone.trim() && !email.trim())) { alert('Please enter a name and at least a phone number or email.'); return; }
    if ((email && DB.students.some((s) => (s.email || '').toLowerCase() === email.toLowerCase())) || (phone && DB.students.some((s) => s.phone === phone))) {
      alert('A student with this email or phone already exists.'); return;
    }
    const rec = { id: uid('st'), name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), joinDate: new Date().toISOString().slice(0, 10), paymentStatus: status, batch: status === 'Approved' ? batch : '—' };
    saveDB((prev) => ({ ...prev, students: [...prev.students, rec] }));
    setForm({ ...EMPTY, batch: DB.batches[0]?.name || '' });
  };

  const grantAccess = (id) => saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === id ? { ...s, paymentStatus: 'Approved', batch: s.batch === '—' ? 'WBP Special' : s.batch } : s)) }));
  const blockStudent = (id) => saveDB((prev) => ({ ...prev, students: prev.students.map((s) => (s.id === id ? { ...s, paymentStatus: 'Blocked' } : s)) }));
  const deleteStudent = (id) => {
    if (!confirm('Are you sure you want to delete this student record? This cannot be undone.')) return;
    saveDB((prev) => ({ ...prev, students: prev.students.filter((s) => s.id !== id) }));
  };
  const exportStudentsExcel = () => {
    const rows = DB.students.filter((s) => !isExemptEmail(s.email)).map((s, i) => ({ SerialNo: i + 1, Name: s.name, Phone: s.phone, Email: s.email, Address: s.address, JoinDate: s.joinDate, PaymentStatus: s.paymentStatus, Batch: s.batch }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students'); XLSX.writeFile(wb, 'TCE_Students.xlsx');
  };

  const statusBadge = (status) => (status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : status === 'Pending' ? 'bg-amber-500/20 gold-text' : 'bg-gray-500/20 muted');

  return (
    <div>
      <div className="card2 rounded-xl p-4 mb-4">
        <p className="text-xs font-bold muted uppercase mb-3">Manually Enroll a Student</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} type="text" placeholder="Full Name" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" placeholder="Phone Number" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} type="text" placeholder="Address (optional)" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg px-3 py-2 text-xs">
            <option value="Approved">Approved (grant mock access now)</option>
            <option value="Not Enrolled">Not Enrolled</option>
            <option value="Pending">Pending</option>
          </select>
          <select value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className="rounded-lg px-3 py-2 text-xs">
            {DB.batches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <button onClick={addStudentManually} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />+ Enroll Student</button>
        <p className="text-[11px] muted mt-2">The student becomes eligible for enrolled/paid mock tests the moment they log in with this same email or phone.</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm muted">{listed.length} registered students</p>
        <button onClick={exportStudentsExcel} className="btn-gold rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" />Export to Excel</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="card2"><tr className="text-left muted"><th className="p-2">#</th><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Email</th><th className="p-2">Address</th><th className="p-2">Joined</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
          <tbody>
            {listed.map((s, i) => (
              <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-2">{i + 1}</td><td className="p-2">{s.name}</td><td className="p-2">{s.phone}</td><td className="p-2">{s.email}</td><td className="p-2">{s.address || '-'}</td><td className="p-2">{s.joinDate}</td>
                <td className="p-2"><span className={`badge ${statusBadge(s.paymentStatus)}`}>{s.paymentStatus}</span></td>
                <td className="p-2 flex gap-1">
                  <button onClick={() => grantAccess(s.id)} className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold">Grant</button>
                  <button onClick={() => blockStudent(s.id)} className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold">Block</button>
                  <button onClick={() => deleteStudent(s.id)} className="px-2 py-1 rounded bg-gray-600 text-white text-[10px] font-bold flex items-center gap-0.5"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
