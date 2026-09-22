'use client';

import React, { useState } from 'react';
import { FileUp, Upload, Lock, Unlock, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../lib/utils';

const CATS = [['math', 'Math'], ['english', 'English'], ['reasoning', 'Reasoning'], ['gk', 'GK'], ['science', 'Science'], ['currentAffairs', 'Current Affairs']];
const MATERIAL_SUBCATEGORIES = { english: ['Grammar', 'Vocabulary'], gk: ['History', 'Economy', 'Polity', 'Geography'], science: ['Physics', 'Chemistry', 'Biology'] };

export default function MaterialsManager() {
  const { DB, saveDB } = useApp();
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('math');
  const [subCategory, setSubCategory] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [freeDemo, setFreeDemo] = useState(false);

  const uploadMaterial = () => {
    if (!title.trim()) { alert('Please enter a material title.'); return; }
    const finalize = (fileUrl) => {
      const mat = { id: uid('mat'), title: title.trim(), url: fileUrl || '', subCategory: subCategory || undefined, isFreeDemo: freeDemo, views: 0 };
      saveDB((prev) => ({ ...prev, materials: { ...prev.materials, [cat]: [...(prev.materials[cat] || []), mat] } }));
      setTitle(''); setSubCategory(''); setUrl(''); setFile(null); setFreeDemo(false);
    };
    if (file) {
      if (file.type !== 'application/pdf') { alert('Please choose a PDF file.'); return; }
      const reader = new FileReader();
      reader.onload = (e) => finalize(e.target.result);
      reader.onerror = () => { alert('Could not read the selected file. Try again or paste a URL instead.'); finalize(url); };
      reader.readAsDataURL(file);
    } else {
      finalize(url);
    }
  };

  const deleteMaterial = (c, id) => {
    if (!confirm('Delete this material permanently?')) return;
    saveDB((prev) => ({ ...prev, materials: { ...prev.materials, [c]: prev.materials[c].filter((m) => m.id !== id) } }));
  };
  const toggleFreeDemo = (c, id) => saveDB((prev) => ({ ...prev, materials: { ...prev.materials, [c]: prev.materials[c].map((m) => (m.id === id ? { ...m, isFreeDemo: !m.isFreeDemo } : m)) } }));

  const subCatOptions = MATERIAL_SUBCATEGORIES[cat];

  return (
    <div>
      <div className="card2 rounded-xl p-4 mb-6">
        <p className="text-xs font-bold muted uppercase mb-3">Upload Study Material (PDF)</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="Material Title" className="rounded-lg px-3 py-2 text-xs" />
          <select value={cat} onChange={(e) => { setCat(e.target.value); setSubCategory(''); }} className="rounded-lg px-3 py-2 text-xs">
            {CATS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        {subCatOptions && (
          <div className="grid sm:grid-cols-2 gap-2 mb-2">
            <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="rounded-lg px-3 py-2 text-xs">
              <option value="">No sub-category</option>
              {subCatOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2 mb-2 items-center">
          <label className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <FileUp className="w-3.5 h-3.5" /><span>{file ? file.name : 'Choose PDF File'}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} type="text" placeholder="...or paste a direct PDF URL instead" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 cursor-pointer w-fit">
          <input type="checkbox" checked={freeDemo} onChange={(e) => setFreeDemo(e.target.checked)} className="w-4 h-4 accent-amber-500" />Mark as Free Demo (accessible to everyone, not just enrolled students)
        </label>
        <button onClick={uploadMaterial} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />+ Upload Material</button>
        <p className="text-[11px] muted mt-2">Upload a PDF file (stored securely as Base64) or paste a direct PDF link. Either is optional if you just want to reserve a title.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {CATS.map(([id, label]) => (
          <div key={id} className="card2 rounded-xl p-4">
            <p className="text-xs font-bold muted uppercase mb-2">{label}</p>
            <div className="space-y-1">
              {(DB.materials[id] || []).length ? (DB.materials[id] || []).map((m) => (
                <div key={m.id} className="flex justify-between items-center text-xs card rounded-md px-2 py-1.5">
                  <span>{m.title}{m.subCategory ? ' — ' + m.subCategory : ''} <span className={`font-bold ${m.isFreeDemo ? 'text-emerald-400' : 'gold-text'}`}>{m.isFreeDemo ? '[Free Demo]' : '[Enrolled-Only]'}</span> <span className="muted">({m.views || 0} views{m.url ? ', file attached' : ', no file yet'})</span></span>
                  <span className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleFreeDemo(id, m.id)} className="text-amber-400" title={m.isFreeDemo ? 'Mark as Enrolled-Only' : 'Mark as Free Demo'}>{m.isFreeDemo ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => deleteMaterial(id, m.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              )) : <p className="text-[11px] muted">None yet</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
