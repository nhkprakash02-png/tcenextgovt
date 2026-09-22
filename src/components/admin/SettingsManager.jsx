'use client';

import React from 'react';
import { Download, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function SettingsManager() {
  const { DB, saveDB } = useApp();

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'TCE_Backup_' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
  };

  const importBackup = (file) => {
    if (!file) return;
    if (!confirm('This will overwrite ALL current data with the imported backup. Continue?')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        saveDB(data); // saveDB accepts either an updater fn or a full replacement value
        alert('Data restored successfully.');
      } catch (err) { alert('Invalid backup file: ' + err.message); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="card2 rounded-xl p-4">
      <p className="text-xs font-bold muted uppercase mb-3">Data Protection</p>
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={exportBackup} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export All Data (Backup JSON)</button>
        <label className="btn-ghost rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />Import Data (Restore JSON)
          <input type="file" accept="application/json" className="hidden" onChange={(e) => importBackup(e.target.files[0])} />
        </label>
      </div>
      <p className="text-[11px] muted mt-2">Importing will overwrite all current data after confirmation.</p>
    </div>
  );
}
