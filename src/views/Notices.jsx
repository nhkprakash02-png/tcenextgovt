'use client';

import React, { useState } from 'react';
import { MapPin, Globe, Phone, Mail, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uid } from '../lib/utils';

export default function Notices() {
  const { DB, saveDB } = useApp();
  const [form, setForm] = useState({ name: '', phone: '', msg: '' });

  const submitInquiry = () => {
    const { name, phone, msg } = form;
    if (!name.trim() || !phone.trim() || !msg.trim()) { alert('Please fill all fields.'); return; }
    saveDB((prev) => ({
      ...prev,
      inquiries: [...prev.inquiries, { id: uid('inq'), name: name.trim(), phone: phone.trim(), msg: msg.trim(), date: new Date().toISOString() }],
    }));
    alert('Thank you! Your inquiry has been submitted. We will contact you soon.');
    setForm({ name: '', phone: '', msg: '' });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <h2 className="font-display font-800 text-2xl mb-4">Notice <span className="gold-text">Board</span></h2>
        <div className="space-y-4">
          {[...DB.notices].reverse().map((n) => (
            <div key={n.id} className="card glow-border rounded-xl p-4">
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-sm">{n.title}</p>
                <span className="text-[10px] muted whitespace-nowrap">{n.date}</span>
              </div>
              <p className="text-xs muted">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-display font-800 text-2xl mb-4">Contact <span className="gold-text">Us</span></h2>
        <div className="card glow-border rounded-2xl p-5 mb-5">
          <h4 className="font-semibold text-xs uppercase tracking-wide muted mb-3">Institute Address</h4>
          <p className="text-sm flex items-start gap-2 mb-3"><MapPin className="w-4 h-4 gold-text shrink-0 mt-0.5" /> Near Nahata Anchal, Nahata, P.S. Gopalnagar, North 24 Parganas, West Bengal, PIN - 743290</p>
          <p className="text-sm gold-text font-semibold flex items-center gap-2 mb-2"><Globe className="w-3.5 h-3.5" /> Tcenahata.in</p>
          <p className="text-sm muted flex items-center gap-2 mb-2"><Phone className="w-3.5 h-3.5 gold-text" /> +91 73846 44030</p>
          <p className="text-sm muted flex items-center gap-2"><Mail className="w-3.5 h-3.5 gold-text" /> tcenahata@gmail.com</p>
        </div>
        <div className="card glow-border rounded-2xl p-5 mb-5">
          <h4 className="font-semibold text-xs uppercase tracking-wide muted mb-3">Faculty Contact</h4>
          <div className="space-y-3">
            <a href="https://wa.me/919749587349?text=Hello%20Sir%2C%20I%20want%20to%20know%20more%20about%20TCE%20classes" target="_blank" rel="noreferrer" className="flex items-center justify-between card2 rounded-lg px-3 py-2.5">
              <div><p className="text-sm font-semibold">Tanujoy Mallick</p><p className="text-xs muted">+91 97495 87349</p></div>
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </a>
            <a href="https://wa.me/917384644030?text=Hello%20Sir%2C%20I%20want%20to%20know%20more%20about%20TCE%20classes" target="_blank" rel="noreferrer" className="flex items-center justify-between card2 rounded-lg px-3 py-2.5">
              <div><p className="text-sm font-semibold">Prakash Sarkar</p><p className="text-xs muted">+91 73846 44030</p></div>
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
            </a>
          </div>
        </div>
        <div className="card glow-border rounded-2xl p-5">
          <div className="space-y-3">
            <input type="text" placeholder="Your Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" />
            <input type="tel" placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" />
            <textarea rows={4} placeholder="Your message / inquiry" value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} className="w-full rounded-lg px-3 py-2.5 text-sm" />
            <button onClick={submitInquiry} className="w-full btn-gold rounded-lg py-2.5 text-sm font-bold">Send Inquiry</button>
          </div>
        </div>
      </div>
    </div>
  );
}
