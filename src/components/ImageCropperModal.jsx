'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { canvasToCompressedBase64 } from '../lib/imageUtils';

const VIEWPORT = 260; // on-screen crop circle size, px
const OUTPUT = 320; // exported square image size, px

// A minimal, dependency-free crop tool: the image can be dragged to reposition and zoomed with
// a slider; "Save Photo" bakes the current view into a square canvas and hands back a
// compressed Base64 JPEG. No cropping library — just pointer events and <canvas>.
export default function ImageCropperModal({ file, onCancel, onSave }) {
  const [imgEl, setImgEl] = useState(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const base = Math.max(VIEWPORT / img.width, VIEWPORT / img.height);
      setImgEl(img);
      setMinScale(base);
      setScale(base);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampOffset = (o, s) => {
    if (!imgEl) return o;
    const w = imgEl.width * s, h = imgEl.height * s;
    const maxX = Math.max(0, (w - VIEWPORT) / 2);
    const maxY = Math.max(0, (h - VIEWPORT) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };

  const pointFrom = (e) => (e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY });

  const handleDown = (e) => { dragRef.current = { start: pointFrom(e), offset: { ...offset } }; };
  const handleMove = (e) => {
    if (!dragRef.current) return;
    const p = pointFrom(e);
    const dx = p.x - dragRef.current.start.x;
    const dy = p.y - dragRef.current.start.y;
    setOffset(clampOffset({ x: dragRef.current.offset.x + dx, y: dragRef.current.offset.y + dy }, scale));
  };
  const handleUp = () => { dragRef.current = null; };

  const handleZoom = (e) => {
    if (!imgEl) return;
    const factor = parseFloat(e.target.value);
    const next = minScale * factor;
    setScale(next);
    setOffset((o) => clampOffset(o, next));
  };

  const save = () => {
    if (!imgEl) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT; canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    const factor = OUTPUT / VIEWPORT;
    const drawW = imgEl.width * scale * factor;
    const drawH = imgEl.height * scale * factor;
    const clamped = clampOffset(offset, scale);
    const drawX = OUTPUT / 2 - drawW / 2 + clamped.x * factor;
    const drawY = OUTPUT / 2 - drawH / 2 + clamped.y * factor;
    ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
    onSave(canvasToCompressedBase64(canvas));
  };

  const clamped = clampOffset(offset, scale);

  return (
    <Modal title="Crop Your Photo" onClose={onCancel}>
      <p className="text-xs muted mb-4">Drag to reposition, use the slider to zoom, then save.</p>
      <div
        className="mx-auto rounded-full overflow-hidden relative touch-none select-none"
        style={{ width: VIEWPORT, height: VIEWPORT, background: '#000', cursor: 'grab', border: '2px solid var(--border)' }}
        onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
        onTouchStart={handleDown} onTouchMove={handleMove} onTouchEnd={handleUp}
      >
        {imgEl && (
          <img
            src={imgEl.src} alt="" draggable={false}
            style={{
              position: 'absolute', left: '50%', top: '50%', maxWidth: 'none',
              width: imgEl.width * scale, height: imgEl.height * scale,
              transform: `translate(-50%, -50%) translate(${clamped.x}px, ${clamped.y}px)`,
            }}
          />
        )}
      </div>
      <input type="range" min="1" max="3" step="0.01" defaultValue="1" onChange={handleZoom} className="w-full mt-5 accent-amber-500" disabled={!imgEl} />
      <div className="flex gap-2 mt-5">
        <button onClick={onCancel} className="flex-1 btn-ghost rounded-lg py-2.5 text-sm font-bold">Cancel</button>
        <button onClick={save} disabled={!imgEl} className="flex-1 btn-gold rounded-lg py-2.5 text-sm font-bold disabled:opacity-50">Save Photo</button>
      </div>
    </Modal>
  );
}
