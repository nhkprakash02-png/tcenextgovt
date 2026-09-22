'use client';

import React, { useState } from 'react';
import { ImageUp, Upload, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uid } from '../../lib/utils';
import { saveBanners as persistBanners } from '../../lib/db';

export default function BannersManager() {
  const { banners, setBanners } = useApp();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [url, setUrl] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);

  const commit = (next) => { setBanners(next); persistBanners(next); };

  const uploadBanner = () => {
    if (!title.trim()) { alert('Please enter a banner title.'); return; }
    const finalize = (imageSrc) => {
      const banner = { id: uid('bn'), title: title.trim(), subtitle: subtitle.trim(), image: imageSrc || '', link: link.trim(), grad: 'from-amber-600 via-yellow-500 to-orange-600', tag: '' };
      commit([...banners, banner]);
      setTitle(''); setSubtitle(''); setUrl(''); setLink(''); setFile(null);
    };
    if (file) {
      const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name || '');
      if (!looksLikeImage) { alert('Please choose a valid image file (JPG, PNG, GIF, WEBP, BMP or SVG).'); return; }
      if (file.size > 4 * 1024 * 1024) { alert('That image is larger than 4MB, which is too big to store. Please choose a smaller image or paste a direct image URL instead.'); return; }
      const reader = new FileReader();
      reader.onload = (e) => { const result = e.target && e.target.result; if (!result) { alert('Could not read the selected image (empty result). Please try again or paste a URL instead.'); return; } finalize(result); };
      reader.onerror = () => alert('Could not read the selected image. Please try a different image file or paste a direct image URL instead.');
      reader.readAsDataURL(file);
    } else {
      finalize(url);
    }
  };

  const deleteBanner = (id) => {
    if (!confirm('Delete this banner permanently?')) return;
    commit(banners.filter((b) => b.id !== id));
  };

  return (
    <div>
      <div className="card2 rounded-xl p-4 mb-6">
        <p className="text-xs font-bold muted uppercase mb-3">Add New Banner</p>
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="Banner Title" className="rounded-lg px-3 py-2 text-xs" />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} type="text" placeholder="Subtitle" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-2 items-center">
          <label className="btn-ghost rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <ImageUp className="w-3.5 h-3.5" /><span>{file ? file.name : 'Choose Banner Image'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} type="text" placeholder="...or paste a direct image URL instead" className="rounded-lg px-3 py-2 text-xs" />
        </div>
        <input value={link} onChange={(e) => setLink(e.target.value)} type="text" placeholder="Optional link (e.g. https://... opens when banner CTA is clicked)" className="w-full rounded-lg px-3 py-2 text-xs mb-2" />
        <button onClick={uploadBanner} className="btn-gold rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />+ Add Banner</button>
        <p className="text-[11px] muted mt-2">If no image is uploaded, the banner falls back to a gold gradient background.</p>
      </div>

      <p className="text-xs font-bold muted uppercase mb-2">Active Banners ({banners.length})</p>
      <div className="space-y-2">
        {banners.length ? banners.map((b) => (
          <div key={b.id} className="card2 rounded-xl p-3 flex items-center gap-3">
            {b.image ? <img src={b.image} className="w-20 h-14 object-cover rounded-lg shrink-0" alt={b.title} /> : <div className="w-20 h-14 rounded-lg gold-grad shrink-0 flex items-center justify-center text-ink text-[10px] font-bold">No Image</div>}
            <div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{b.title || '(untitled)'}</p><p className="text-xs muted truncate">{b.subtitle || ''}</p></div>
            <button onClick={() => deleteBanner(b.id)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold bg-red-600 text-white shrink-0 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete</button>
          </div>
        )) : <p className="muted text-sm">No banners yet — add one above.</p>}
      </div>
    </div>
  );
}
