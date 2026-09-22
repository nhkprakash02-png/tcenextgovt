'use client';

import React, { useState } from 'react';
import { Printer, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../lib/utils';
import { printOfflinePaper } from '../../lib/examEngine';
import QuestionEditor from './QuestionEditor';

export default function PyqManager() {
  const { DB, saveDB } = useApp();
  const [testId, setTestId] = useState(null);
  const activeTestId = testId || DB.pyqSets[0]?.id || null;
  const test = DB.pyqSets.find((t) => t.id === activeTestId);

  const updateSets = (updater) => saveDB((prev) => ({ ...prev, pyqSets: updater(prev.pyqSets) }));
  const updateTestQuestions = (updater) => updateSets((sets) => sets.map((t) => (t.id === activeTestId ? { ...t, questions: updater(t.questions) } : t)));

  const addNewPyqSet = () => {
    const title = prompt('PYQ Set title (e.g. "WBP Constable PYQ 2025"):'); if (!title) return;
    const examCategory = prompt('Exam category:', DB.examCategories[0] || 'WBP Constable') || DB.examCategories[0];
    const year = prompt('Year (e.g. 2025):', '2025') || '2025';
    const durationInput = prompt('Test duration (in minutes):', '30');
    const durationMin = durationInput !== null && parseFloat(durationInput) > 0 ? parseFloat(durationInput) : 30;
    const nt = { id: uid('pyq'), title, examCategory, year, durationMin, marksCorrect: 1, marksWrong: 0.25, questions: [] };
    updateSets((sets) => [...sets, nt]);
    setTestId(nt.id);
  };
  const editPyqMeta = () => {
    if (!test) return;
    const title = prompt('Title:', test.title); if (title === null) return;
    const examCategory = prompt('Exam Category:', test.examCategory); if (examCategory === null) return;
    const year = prompt('Year:', test.year); if (year === null) return;
    const dur = prompt('Duration (min):', test.durationMin); if (dur === null) return;
    const mw = prompt('Negative marking:', test.marksWrong); if (mw === null) return;
    updateSets((sets) => sets.map((t) => (t.id === activeTestId ? { ...t, title, examCategory, year, durationMin: parseFloat(dur) || t.durationMin, marksWrong: parseFloat(mw) >= 0 ? parseFloat(mw) : t.marksWrong } : t)));
  };
  const deleteTest = () => {
    if (!test) return;
    if (!confirm(`Delete PYQ set "${test.title}" permanently?`)) return;
    updateSets((sets) => sets.filter((t) => t.id !== activeTestId));
    setTestId(null);
  };
  const addExamCategory = () => {
    const c = prompt('New exam category name:'); if (!c) return;
    if (!DB.examCategories.includes(c)) saveDB((prev) => ({ ...prev, examCategories: [...prev.examCategories, c] }));
  };
  const removeExamCategory = (c) => {
    if (!confirm(`Remove category "${c}"?`)) return;
    saveDB((prev) => ({ ...prev, examCategories: prev.examCategories.filter((x) => x !== c) }));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select value={activeTestId || ''} onChange={(e) => setTestId(e.target.value)} className="rounded-lg px-3 py-2 text-xs">
          {DB.pyqSets.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <button onClick={addNewPyqSet} className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold">+ New PYQ Set</button>
        {test && (
          <>
            <button onClick={editPyqMeta} className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold">Edit Set Info</button>
            <button onClick={() => printOfflinePaper(test)} className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1"><Printer className="w-3.5 h-3.5" />Print Paper</button>
            <button onClick={deleteTest} className="rounded-lg px-3 py-2 text-xs font-bold bg-red-600 text-white flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete Set</button>
          </>
        )}
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold muted uppercase mb-2">Manage Exam Categories</p>
        <div className="flex flex-wrap gap-2 items-center">
          {DB.examCategories.map((c) => (
            <span key={c} className="badge card2 flex items-center gap-1">{c} <button onClick={() => removeExamCategory(c)} className="text-red-400 ml-1">×</button></span>
          ))}
          <button onClick={addExamCategory} className="btn-ghost rounded-lg px-2 py-1 text-[11px] font-bold">+ Add Category</button>
        </div>
      </div>

      {test ? <QuestionEditor test={test} onChangeQuestions={updateTestQuestions} /> : <p className="muted text-sm">No PYQ sets yet — create one above.</p>}
    </div>
  );
}
