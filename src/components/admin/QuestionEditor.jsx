'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, Loader2, X, ImagePlus } from 'lucide-react';
import { uid } from '../../lib/utils';
import { resolveCorrectKey } from '../../lib/examEngine';
import { uploadQuestionSolutionImage } from '../../lib/questionImageUpload';
import SolutionImage from '../SolutionImage';

const EMPTY = { en: '', bn: '', a: '', b: '', c: '', d: '', correct: 'A', exp: '', solimg: '' };

// `onChange(updater)` receives a function that maps the current `test.questions` array to the
// new one — the caller (MockManager/PyqManager) applies it via saveDB.
export default function QuestionEditor({ test, onChangeQuestions }) {
  const [form, setForm] = useState(EMPTY);
  const [bulkJson, setBulkJson] = useState('');
  // New: solution-image upload state only — doesn't touch any existing field or flow.
  const [solImgUploading, setSolImgUploading] = useState(false);
  const [solImgError, setSolImgError] = useState('');
  // New: per-question solution-photo upload from the question list (works for bulk-uploaded
  // questions too). Tracks which question is uploading and which one last failed, with why.
  const [rowUploadingId, setRowUploadingId] = useState(null);
  const [rowError, setRowError] = useState({ id: null, msg: '' });

  const handleRowSolutionImage = async (qid, e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    // Input is cleared only after the upload finishes (see `finally`) — clearing it first can
    // make some phones lose the picked file before it has been read.
    setRowError({ id: null, msg: '' });
    setRowUploadingId(qid);
    try {
      // Same helper the Add Question form uses: rejects non-images and files over 1MB with a
      // clear message, shrinks the photo, saves it in Firestore (no Firebase Storage needed) and
      // returns a short reference to store on the question. Every upload gets a brand-new
      // reference, so a replaced photo never shows a stale cached image.
      const url = await uploadQuestionSolutionImage(file, { testId: test?.id, subject: test?.subject, questionId: qid + '_' + Date.now().toString(36) });
      onChangeQuestions((qs) => qs.map((x) => (x.id === qid ? { ...x, solutionImg: url } : x)));
    } catch (err) {
      const msg = err.message || 'Upload failed. Please try again.';
      setRowError({ id: qid, msg });
      alert('Solution photo upload failed:\n\n' + msg);
    } finally {
      setRowUploadingId(null);
      try { input.value = ''; } catch (err) { /* ignore */ } // lets the admin re-pick the same file
    }
  };

  const removeRowSolutionImage = (qid) => {
    if (!confirm('Remove the solution photo from this question?')) return;
    onChangeQuestions((qs) => qs.map((x) => (x.id === qid ? { ...x, solutionImg: '' } : x)));
  };

  const handleSolutionImageChange = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    // NOTE: the input is cleared only AFTER the upload finishes (see `finally`). Clearing it
    // straight away can make some phones drop their hold on the picked file before it is read,
    // which caused the intermittent "could not be read as an image" error.
    setSolImgError('');
    setSolImgUploading(true);
    try {
      const url = await uploadQuestionSolutionImage(file, { testId: test?.id, subject: test?.subject, questionId: uid('qimg') });
      setForm((f) => ({ ...f, solimg: url }));
    } catch (err) {
      const msg = err.message || 'Upload failed. Please try again.';
      setSolImgError(msg);
      alert('Solution photo upload failed:\n\n' + msg);
    } finally {
      setSolImgUploading(false);
      try { input.value = ''; } catch (err) { /* ignore */ } // allow re-selecting the same file
    }
  };

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
          <div className="flex flex-col gap-1">
            {/* Solution image: was a plain URL/Base64 text input, now a direct file upload to
                Firebase Storage. Validation (strictly under 1MB) reuses validateSourcePhoto from
                lib/imageUtils.js — the same rule already enforced for profile photos — so the
                error message a student or admin sees for "file too big" is consistent app-wide. */}
            <label className="rounded-lg px-3 py-2 text-xs border flex items-center justify-between cursor-pointer" style={{ borderColor: 'var(--border)' }}>
              <span className="muted">{solImgUploading ? 'Uploading…' : form.solimg ? 'Solution photo ✓ uploaded' : 'Upload solution photo (optional, max 1MB)'}</span>
              {solImgUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <input type="file" accept="image/*" onChange={handleSolutionImageChange} disabled={solImgUploading} className="hidden" />
            </label>
            {form.solimg && !solImgUploading && (
              <div className="flex items-center gap-2">
                <SolutionImage src={form.solimg} alt="Solution preview" className="h-10 w-10 object-cover rounded border" style={{ borderColor: 'var(--border)' }} />
                <button type="button" onClick={() => setForm((f) => ({ ...f, solimg: '' }))} className="text-[10px] muted flex items-center gap-0.5 hover:text-current">
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            )}
            {solImgError && <p className="text-[10px] text-red-400">{solImgError}</p>}
          </div>
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
              {q.solutionImg && (
                <div className="flex items-center gap-2 mt-1.5">
                  <SolutionImage src={q.solutionImg} alt="Solution" className="h-10 w-10 object-cover rounded border" style={{ borderColor: 'var(--border)' }} />
                  <button type="button" onClick={() => removeRowSolutionImage(q.id)} className="text-[10px] muted flex items-center gap-0.5 hover:text-current">
                    <X className="w-3 h-3" /> Remove photo
                  </button>
                </div>
              )}
              {rowError.id === q.id && rowError.msg && <p className="text-[10px] text-red-400 mt-1">{rowError.msg}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <label
                title={q.solutionImg ? 'Replace solution photo (max 1MB)' : 'Upload solution photo (max 1MB)'}
                className={`cursor-pointer ${q.solutionImg ? 'text-emerald-400' : 'text-sky-400'} ${rowUploadingId === q.id ? 'opacity-60 pointer-events-none' : ''}`}
              >
                {rowUploadingId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                <input type="file" accept="image/*" onChange={(e) => handleRowSolutionImage(q.id, e)} disabled={rowUploadingId !== null} className="hidden" />
              </label>
              <button onClick={() => editQuestion(q.id)} className="text-amber-400"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => deleteQuestion(q.id)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
