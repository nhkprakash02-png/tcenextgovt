'use client';

import React, { useMemo, useState } from 'react';
import { FileText, Eye, Lock, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildWatermarkedPdfBytes } from '../lib/watermark';
import Modal from '../components/Modal';

const CATS = [['math', 'Math'], ['english', 'English'], ['reasoning', 'Reasoning'], ['gk', 'GK'], ['science', 'Science'], ['currentAffairs', 'Current Affairs']];
const MATERIAL_SUBCATEGORIES = {
  english: ['Grammar', 'Vocabulary'],
  gk: ['History', 'Economy', 'Polity', 'Geography'],
  science: ['Physics', 'Chemistry', 'Biology'],
};

// Mirrors: userAdmin || userEnrolled || isFreeDemo.
function canAccessMaterial(material, isEnrolled, admin) {
  const isFreeDemo = material.isFreeDemo === true || material.isDemo === true;
  return !!(admin || isEnrolled() || isFreeDemo);
}

export default function StudyMaterials() {
  const { DB, saveDB, user, hasFullAccess, isEnrolled, openModal } = useApp();
  const [cat, setCat] = useState('math');
  const [subCat, setSubCat] = useState('all');
  const [previewMat, setPreviewMat] = useState(null); // { mat, url }
  const [busyId, setBusyId] = useState(null);

  const mats = useMemo(() => {
    let list = DB.materials[cat] || [];
    if (subCat !== 'all') list = list.filter((m) => m.subCategory === subCat);
    return list;
  }, [DB.materials, cat, subCat]);

  const incrementView = (id) => {
    saveDB((prev) => ({
      ...prev,
      materials: { ...prev.materials, [cat]: prev.materials[cat].map((m) => (m.id === id ? { ...m, views: (m.views || 0) + 1 } : m)) },
    }));
  };

  const handlePreview = async (m) => {
    const isFreeDemo = !!m.isFreeDemo;
    if (!isFreeDemo) {
      if (!user) { alert('Please login to view watermarked materials.'); openModal('login'); return; }
      if (!canAccessMaterial(m, isEnrolled, hasFullAccess)) { openModal('enroll', { context: 'materialsLocked' }); return; }
    }
    incrementView(m.id);
    if (m.url && !m.url.startsWith('data:')) { window.open(m.url, '_blank'); return; }
    setBusyId(m.id);
    try {
      const bytes = await buildWatermarkedPdfBytes(m, user);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      setPreviewMat({ mat: m, url: URL.createObjectURL(blob) });
    } finally { setBusyId(null); }
  };

  const handleDownload = async (m) => {
    const isFreeDemo = !!m.isFreeDemo;
    if (!isFreeDemo) {
      if (!user) { alert('Please login to download watermarked materials.'); openModal('login'); return; }
      if (!canAccessMaterial(m, isEnrolled, hasFullAccess)) { openModal('enroll', { context: 'materialsLocked' }); return; }
    }
    if (m.url && !m.url.startsWith('data:')) {
      const a = document.createElement('a'); a.href = m.url; a.download = m.title.replace(/\s+/g, '_') + '_TCE'; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    setBusyId(m.id);
    try {
      const bytes = await buildWatermarkedPdfBytes(m, user);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = m.title.replace(/\s+/g, '_') + '_TCE.pdf'; a.click();
    } finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-800 text-2xl mb-1">Study <span className="gold-text">Materials</span></h2>
          <p className="muted text-sm">All PDFs are watermarked and licensed to your name automatically to prevent piracy.</p>
        </div>
        <span className="badge bg-red-500/15 text-red-400 w-fit">🔒 Paid / Enrolled Students Only (except Free Demo)</span>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        {CATS.map(([id, label]) => (
          <button key={id} onClick={() => { setCat(id); setSubCat('all'); }} className={`px-4 py-2 rounded-lg text-xs font-bold ${cat === id ? 'tab-active' : 'card2 muted'}`}>{label}</button>
        ))}
      </div>

      {MATERIAL_SUBCATEGORIES[cat] && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-6">
          <button onClick={() => setSubCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${subCat === 'all' ? 'tab-active' : 'card2 muted'}`}>All</button>
          {MATERIAL_SUBCATEGORIES[cat].map((sc) => (
            <button key={sc} onClick={() => setSubCat(sc)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${subCat === sc ? 'tab-active' : 'card2 muted'}`}>{sc}</button>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mats.length ? mats.map((m) => {
          const locked = !canAccessMaterial(m, isEnrolled, hasFullAccess);
          return (
            <div key={m.id} className="card glow-border rounded-2xl p-5">
              <FileText className="w-8 h-8 gold-text mb-3" />
              <h3 className="font-display font-700 text-sm mb-1">{m.title}</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {m.subCategory && <span className="badge bg-purple-500/15 text-purple-400 inline-block">{m.subCategory}</span>}
                <span className={`badge inline-block ${m.isFreeDemo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/15 gold-text'}`}>{m.isFreeDemo ? 'FREE DEMO' : 'PREMIUM'}</span>
                {locked && <span className="badge bg-red-500/15 text-red-400 inline-block">🔒 Locked</span>}
              </div>
              <p className="text-[10px] muted mb-3 flex items-center gap-1"><Eye className="w-3 h-3" />{m.views || 0} views</p>
              {locked ? (
                <button onClick={() => openModal('enroll', { context: 'materialsLocked' })} className="w-full btn-ghost rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />Enroll in Batch to Unlock
                </button>
              ) : (
                <div className="flex gap-2">
                  <button disabled={busyId === m.id} onClick={() => handlePreview(m)} className="flex-1 btn-ghost rounded-lg py-2 text-xs font-bold disabled:opacity-50">{busyId === m.id ? '...' : 'Preview'}</button>
                  <button disabled={busyId === m.id} onClick={() => handleDownload(m)} className="flex-1 btn-gold rounded-lg py-2 text-xs font-bold disabled:opacity-50">{busyId === m.id ? '...' : 'Download'}</button>
                </div>
              )}
            </div>
          );
        }) : <p className="muted text-sm col-span-full">No materials uploaded yet in this category.</p>}
      </div>

      {previewMat && (
        <Modal title={`${previewMat.mat.title} — Preview`} onClose={() => setPreviewMat(null)} wide>
          <iframe title="Material preview" src={previewMat.url} className="w-full h-[70vh] rounded-lg" style={{ border: '1px solid var(--border)' }} />
          <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
            <p className="text-[11px] muted">Licensed to {user?.name} — unauthorized redistribution is prohibited.</p>
            <button onClick={() => handleDownload(previewMat.mat)} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />Download PDF
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
