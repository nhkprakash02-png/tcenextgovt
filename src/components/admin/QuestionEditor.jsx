'use client';

import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { uid } from '../../lib/utils';
import { resolveCorrectKey } from '../../lib/examEngine';

const EMPTY = { en: '', bn: '', a: '', b: '', c: '', d: '', correct: 'A', exp: '', solimg: '' };

// `onChange(updater)` receives a function that maps the current `test.questions` array to the
// new one — the caller (MockManager/PyqManager) applies it via saveDB.
export default function QuestionEditor({ test, onChangeQuestions }) {
  const [form, setForm] = useState(EMPTY);
  const [bulkJson, setBulkJson] = useState('');

  const addQuestion = () => {
    const { en, bn, a, b, c, d, correct, exp, solimg } = form;
    if (!en.trim() || !a.trim() || !b.trim() || !c.trim() || !d.trim()) { alert('Please fill the question and all 4 options.'); return; }
    const q = { id: uid('q'), textEn: en.trim(), textBn: bn.trim(), options: [{ key: 'A', textEn: a.trim(), textBn: '' }, { key: 'B', textEn: b.trim(), textBn: '' }, { key: 'C', textEn: c.trim(), textBn: '' }, { key: 'D', textEn: d.trim(), textBn: '' }], correct, explanation: exp.trim(), solutionImg: solimg.trim() };
    onChangeQuestions((qs) => [...qs, q]);
    setForm(EMPTY);
  };

  const bulkUpload = () => {
    try {
      const arr = JSON.parse(bulkJson.trim());
      const newQs = arr.map((q) => ({ id: uid('q'), textEn: q.textEn || '', textBn: q.textBn || '', options: q.options || [], correct: resolveCorrectKey(q), explanation: q.explanation || '', solutionImg: q.solutionImg || '' }));
      onChangeQuestions((qs) => [...qs, ...newQs]);
      setBulkJson('');
    } catch (e) { alert('Invalid JSON: ' + e.message); }
  };

  const editQuestion = (qid) => {
    const q = test.questions.find((x) => x.id === qid); if (!q) return;
    const en = prompt('Question (English):', q.textEn); if (en === null) return;
    const a = prompt('Option A:', q.options[0]?.textEn || ''); if (a === null) return;
    const b = prompt('Option B:', q.options[1]?.textEn || ''); if (b === null) return;
    const c = prompt('Option C:', q.options[2]?.textEn || ''); if (c === null) return;
    const d = prompt('Option D:', q.options[3]?.textEn || ''); if (d === null) return;
    const correct = prompt('Correct option (A/B/C/D):', q.correct); if (correct === null) return;
    const exp = prompt('Explanation:', q.explanation || ''); if (exp === null) return;
    onChangeQuestions((qs) => qs.map((x) => (x.id === qid ? { ...x, textEn: en, options: [{ key: 'A', textEn: a, textBn: '' }, { key: 'B', textEn: b, textBn: '' }, { key: 'C', textEn: c, textBn: '' }, { key: 'D', textEn: d, textBn: '' }], correct: correct.toUpperCase(), explanation: exp } : x)));
  };

  const deleteQuestion = (qid) => {
    if (!confirm('Delete this question?')) return;
    onChangeQuestions((qs) => qs.filter((q) => q.id !== qid));
  };

  return (
    <>
      <div className="card2 rounded-xl p-4 mb-4">
        <p className="text-xs font-bold muted uppercase mb-2">Add Question (English and/or Bengali — admin's choice)</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <textarea value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} rows={2} placeholder="Question (English)" className="rounded-lg px-3 py-2 text-xs" />
          <textarea value={form.bn} onChange={(e) => setForm({ ...form, bn: e.target.value })} rows={2} placeholder="প্রশ্ন (বাংলা) — optional" className="rounded-lg px-3 py-2 text-xs bn" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} type="text" placeholder="Option A" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.b} onChange={(e) => setForm({ ...form, b: e.target.value })} type="text" placeholder="Option B" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.c} onChange={(e) => setForm({ ...form, c: e.target.value })} type="text" placeholder="Option C" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.d} onChange={(e) => setForm({ ...form, d: e.target.value })} type="text" placeholder="Option D" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <div className="grid sm:grid-cols-3 gap-2 mb-2">
          <select value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value })} className="rounded-lg px-3 py-2 text-xs">
            <option>A</option><option>B</option><option>C</option><option>D</option>
          </select>
          <input value={form.exp} onChange={(e) => setForm({ ...form, exp: e.target.value })} type="text" placeholder="Explanation" className="rounded-lg px-3 py-2 text-xs" />
          <input value={form.solimg} onChange={(e) => setForm({ ...form, solimg: e.target.value })} type="text" placeholder="Solution photo URL/Base64 (optional)" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <button onClick={addQuestion} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold">+ Add Question</button>
      </div>

      <div className="card2 rounded-xl p-4 mb-4">
        <p className="text-xs font-bold muted uppercase mb-2">Bulk Uploader — paste 50-100 Qs as JSON array</p>
        <textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)} rows={4} placeholder='[{"textEn":"...","options":[{"key":"A","textEn":"..."},...],"correct":"A","explanation":"..."}]' className="w-full rounded-lg px-3 py-2 text-xs font-mono" />
        <button onClick={bulkUpload} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold mt-2">Upload Bulk</button>
      </div>

      <p className="text-xs font-bold muted uppercase mb-2">Questions in "{test.title}" ({test.questions.length})</p>
      <div className="space-y-2">
        {test.questions.map((q, i) => (
          <div key={q.id} className="card rounded-lg p-3 flex justify-between items-start gap-3">
            <div>
              <p className="text-xs font-medium">{i + 1}. {q.textEn} {q.textBn && <span className="bn muted block text-[11px]">{q.textBn}</span>}</p>
              <p className="text-[10px] muted mt-1">Correct: {q.correct}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => editQuestion(q.id)} className="text-amber-400"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => deleteQuestion(q.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
