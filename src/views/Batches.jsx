'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { priceLabel, defaultBatchFeatures } from '../lib/utils';
import PriceTag from '../components/PriceTag';

export default function Batches() {
  const { DB, dbLoading, openModal } = useApp();
  const activeBatches = DB.batches.filter((b) => b.active);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display font-800 text-2xl mb-1">Batches &amp; <span className="gold-text">Direct Enrollment</span></h2>
        <p className="muted text-sm">Choose a batch and enroll instantly via UPI.</p>
      </div>
      <div className="space-y-6">
        {dbLoading ? (
          <div className="card glow-border rounded-2xl p-8 animate-pulse h-64" />
        ) : activeBatches.length ? (
          activeBatches.map((b) => (
            <div key={b.id} className="card glow-border rounded-2xl overflow-hidden">
              <div className="gold-grad p-6 sm:p-8">
                <span className="badge bg-black/20 text-black inline-block mb-2">
                  Featured Batch{b.examCategory && b.examCategory !== 'All Exams' ? ` • ${b.examCategory}` : ''}
                </span>
                <h3 className="font-display font-800 text-2xl text-black">{b.name}</h3>
                <div className="mt-1">
                  <PriceTag price={b.price} originalPrice={b.originalPrice} size="base" theme="gold" />
                  <span className="text-black/80 text-sm ml-1">— Monthly enrollment fee</span>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <h4 className="font-semibold text-sm mb-3">What's Included</h4>
                <ul className="space-y-2 text-sm muted">
                  {(b.features && b.features.length ? b.features : defaultBatchFeatures()).map((f) => (
                    <li key={f} className="flex gap-2 items-center"><CheckCircle className="w-4 h-4 gold-text" />{f}</li>
                  ))}
                </ul>
              </div>
              <div className="px-6 sm:px-8 pb-8">
                <button onClick={() => openModal('enroll', { context: 'batch', batchId: b.id })} className="w-full sm:w-auto btn-gold rounded-lg px-8 py-3 text-sm font-bold">
                  Enroll Now — {priceLabel(b.price)}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="muted text-sm">No active batches available right now. Please check back soon.</p>
        )}
      </div>
    </div>
  );
}
