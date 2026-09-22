'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import PendingApprovals from '../components/admin/PendingApprovals';
import StudentsManager from '../components/admin/StudentsManager';
import ResultsManager from '../components/admin/ResultsManager';
import MockManager from '../components/admin/MockManager';
import PyqManager from '../components/admin/PyqManager';
import GkQuizManager from '../components/admin/GkQuizManager';
import MaterialsManager from '../components/admin/MaterialsManager';
import BatchesManager from '../components/admin/BatchesManager';
import BannersManager from '../components/admin/BannersManager';
import NoticesManager from '../components/admin/NoticesManager';
import UrgentNoticesManager from '../components/admin/UrgentNoticesManager';
import SettingsManager from '../components/admin/SettingsManager';

const TABS = [
  ['pending', 'Pending Approvals', PendingApprovals],
  ['students', 'Students', StudentsManager],
  ['results', 'Mock Results', ResultsManager],
  ['questions', 'Mock/PYQ Manager', MockManager],
  ['pyq', 'PYQ Uploader', PyqManager],
  ['gkquiz', 'GK Quiz Uploader', GkQuizManager],
  ['materials', 'Materials', MaterialsManager],
  ['batches', 'Batches', BatchesManager],
  ['banners', 'Banner Slider', BannersManager],
  ['urgent', 'Urgent Notices', UrgentNoticesManager],
  ['content', 'Notices', NoticesManager],
  ['settings', 'Settings', SettingsManager],
];

// Rendered inside the "adminPanel" Modal (see App.jsx) — this component is just the tab bar +
// body; the modal chrome (title, close button, logout) lives in the Modal wrapper and App.jsx.
export default function AdminPanel() {
  const { setAdmin, closeModal } = useApp();
  const [tab, setTab] = useState('pending');
  const Active = TABS.find((t) => t[0] === tab)?.[2] || PendingApprovals;

  return (
    <div className="-mx-6">
      <div className="flex items-center justify-end px-6">
        <button onClick={() => { setAdmin(false); closeModal(); }} className="btn-ghost rounded-md px-3 py-1.5 text-xs font-bold">Logout</button>
      </div>
      <div className="flex gap-1 px-6 pt-3 overflow-x-auto hide-scrollbar" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 rounded-t-lg text-xs font-bold whitespace-nowrap ${tab === id ? 'tab-active' : 'muted'}`}>{label}</button>
        ))}
      </div>
      <div className="p-6 max-h-[65vh] overflow-y-auto">
        <Active />
      </div>
    </div>
  );
}
