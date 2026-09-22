'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import { uid, defaultBatchFeatures } from '../../lib/utils';
import PriceTag from '../PriceTag';

export default function BatchesManager() {
  const { DB, saveDB } = useApp();

  // Prompts for the two pricing fields and returns { price, originalPrice }.
  // originalPrice is left out entirely (undefined) when blank/invalid/not a
  // real discount, so the frontend falls back to a plain single-price display.
  const promptPricing = (defaultOriginal, defaultSelling) => {
    const originalInput = prompt(
      'Original / Regular Price in ₹ (leave blank if there is no discount):',
      defaultOriginal !== undefined && defaultOriginal !== null ? String(defaultOriginal) : ''
    );
    const sellingInput = prompt(
      'Selling / Discounted Price in ₹ (the amount students actually pay):',
      defaultSelling !== undefined && defaultSelling !== null ? String(defaultSelling) : '300'
    );
    const sellingNum = sellingInput === null ? NaN : Number(sellingInput.trim());
    const price = Number.isFinite(sellingNum) && sellingNum >= 0 ? sellingNum : (defaultSelling ?? 300);
    const originalTrim = originalInput === null ? '' : originalInput.trim();
    const originalNum = Number(originalTrim);
    const originalPrice = originalTrim !== '' && Number.isFinite(originalNum) && originalNum > price ? originalNum : undefined;
    return { price, originalPrice };
  };

  const addBatch = () => {
    const name = prompt('Batch name (e.g. "SSC GD Special"):'); if (!name) return;
    const examCategory = prompt('Exam category tag (e.g. "WBP Constable", "Railway (RRB)", "SSC GD"):', 'All Exams') || 'All Exams';
    const { price, originalPrice } = promptPricing(undefined, 300);
    const featuresInput = prompt("What's Included — list each item separated by a comma (shown on the student Batches page):", defaultBatchFeatures().join(', '));
    const features = (featuresInput === null ? defaultBatchFeatures().join(', ') : featuresInput).split(',').map((f) => f.trim()).filter(Boolean);
    const batch = { id: uid('bt'), name, price, originalPrice, active: true, examCategory, features: features.length ? features : defaultBatchFeatures(), timetable: [['Mon-Fri', 'Regular Classes']] };
    saveDB((prev) => ({ ...prev, batches: [...prev.batches, batch] }));
  };

  const editBatch = (id) => {
    const b = DB.batches.find((x) => x.id === id); if (!b) return;
    const name = prompt('Batch name:', b.name); if (name === null) return;
    const examCategory = prompt('Exam category tag:', b.examCategory || 'All Exams'); if (examCategory === null) return;
    const { price, originalPrice } = promptPricing(b.originalPrice, b.price);
    const featuresInput = prompt("What's Included — list each item separated by a comma (shown on the student Batches page):", (b.features && b.features.length ? b.features : defaultBatchFeatures()).join(', ')); if (featuresInput === null) return;
    const features = featuresInput.split(',').map((f) => f.trim()).filter(Boolean);
    saveDB((prev) => ({ ...prev, batches: prev.batches.map((x) => (x.id === id ? { ...x, name, examCategory: examCategory.trim() || x.examCategory, price, originalPrice, features: features.length ? features : defaultBatchFeatures() } : x)) }));
  };

  const toggleActive = (id) => saveDB((prev) => ({ ...prev, batches: prev.batches.map((b) => (b.id === id ? { ...b, active: !b.active } : b)) }));
  const deleteBatch = (id) => {
    if (!confirm('Delete this batch permanently?')) return;
    saveDB((prev) => ({ ...prev, batches: prev.batches.filter((b) => b.id !== id) }));
  };

  return (
    <div>
      <div className="space-y-3 mb-4">
        {DB.batches.map((b) => (
          <div key={b.id} className="card2 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div><p className="font-semibold text-sm">{b.name}</p><PriceTag price={b.price} originalPrice={b.originalPrice} size="sm" theme="dark" /><p className="text-[10px] muted mt-0.5">{b.examCategory || 'All Exams'}</p></div>
              <span className={`badge ${b.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 muted'}`}>{b.active ? 'Active' : 'Archived'}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => editBatch(b.id)} className="btn-ghost rounded-lg px-3 py-1.5 text-[11px] font-bold">Edit</button>
              <button onClick={() => toggleActive(b.id)} className="btn-ghost rounded-lg px-3 py-1.5 text-[11px] font-bold">{b.active ? 'Archive' : 'Reactivate'}</button>
              <button onClick={() => deleteBatch(b.id)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold bg-red-600 text-white">Delete</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addBatch} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">+ Add New Batch</button>
    </div>
  );
}
