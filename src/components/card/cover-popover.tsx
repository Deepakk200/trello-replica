'use client';

import { useEffect, useRef } from 'react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID, Card } from '@/types';

type Cover = Card['cover'];

const COVER_COLORS: { label: string; hex: string; textColor: 'light' | 'dark' }[] = [
  { label: 'Green',  hex: '#10b981', textColor: 'light' },
  { label: 'Yellow', hex: '#facc15', textColor: 'dark'  },
  { label: 'Orange', hex: '#fb923c', textColor: 'light' },
  { label: 'Red',    hex: '#ef4444', textColor: 'light' },
  { label: 'Purple', hex: '#a855f7', textColor: 'light' },
  { label: 'Blue',   hex: '#2563eb', textColor: 'light' },
  { label: 'Sky',    hex: '#22d3ee', textColor: 'dark'  },
  { label: 'Lime',   hex: '#a3e635', textColor: 'dark'  },
  { label: 'Pink',   hex: '#f472b6', textColor: 'light' },
  { label: 'Black',  hex: '#334155', textColor: 'light' },
];

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#e67e22)',
  'linear-gradient(135deg,#519839,#70a246)',
  'linear-gradient(135deg,#b04632,#e74c3c)',
  'linear-gradient(135deg,#89609e,#8e44ad)',
  'linear-gradient(135deg,#1d6fa4,#27ae60)',
];

const COVER_COLOR_CLASS: Record<string, string> = {
  '#10b981': 'bg-[#10b981]',
  '#facc15': 'bg-[#facc15]',
  '#fb923c': 'bg-[#fb923c]',
  '#ef4444': 'bg-[#ef4444]',
  '#a855f7': 'bg-[#a855f7]',
  '#2563eb': 'bg-[#2563eb]',
  '#22d3ee': 'bg-[#22d3ee]',
  '#a3e635': 'bg-[#a3e635]',
  '#f472b6': 'bg-[#f472b6]',
  '#334155': 'bg-[#334155]',
};

const COVER_GRADIENT_CLASS: Record<string, string> = {
  'linear-gradient(135deg,#0079bf,#5067c5)': 'bg-[linear-gradient(135deg,#0079bf,#5067c5)]',
  'linear-gradient(135deg,#d29034,#e67e22)': 'bg-[linear-gradient(135deg,#d29034,#e67e22)]',
  'linear-gradient(135deg,#519839,#70a246)': 'bg-[linear-gradient(135deg,#519839,#70a246)]',
  'linear-gradient(135deg,#b04632,#e74c3c)': 'bg-[linear-gradient(135deg,#b04632,#e74c3c)]',
  'linear-gradient(135deg,#89609e,#8e44ad)': 'bg-[linear-gradient(135deg,#89609e,#8e44ad)]',
  'linear-gradient(135deg,#1d6fa4,#27ae60)': 'bg-[linear-gradient(135deg,#1d6fa4,#27ae60)]',
};

export function CoverPopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const updateCardCover = useBoardStore((s) => s.updateCardCover);
  const ref = useRef<HTMLDivElement>(null);

  const cover: Cover = card?.cover ?? { type: 'none', size: 'half' };

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  function setSize(size: 'half' | 'full') {
    if (cover.type === 'none') return;
    updateCardCover(cardId, { ...cover, size });
  }

  function setColor(hex: string, textColor: 'light' | 'dark') {
    updateCardCover(cardId, { ...cover, type: 'color', color: hex, textColor, size: cover.size });
  }

  function setGradient(gradient: string) {
    updateCardCover(cardId, { ...cover, type: 'image', image: gradient, textColor: 'light', size: cover.size });
  }

  function coverPreviewClass() {
    if (cover.type === 'color' && cover.color) return COVER_COLOR_CLASS[cover.color] ?? 'bg-[#1d2125]';
    if (cover.type === 'image' && cover.image) return COVER_GRADIENT_CLASS[cover.image] ?? 'bg-[#1d2125]';
    return 'bg-[#1d2125]';
  }

  function removeCover() {
    updateCardCover(cardId, { type: 'none', size: cover.size });
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-64 bg-[#282e33] border border-white/10 rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-3"
    >
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Cover</p>

      {/* Size toggle — only meaningful when a cover is active */}
      {cover.type !== 'none' && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Size</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSize('half')}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded transition-colors ${cover.size === 'half' ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <div className="w-full h-8 rounded bg-[#1d2125] overflow-hidden flex flex-col justify-start">
                <div className={`h-2.5 w-full rounded-t ${coverPreviewClass()}`} />
              </div>
              <span className="text-xs text-slate-300">Half</span>
            </button>
            <button
              onClick={() => setSize('full')}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded transition-colors ${cover.size === 'full' ? 'bg-white/20 ring-1 ring-white/40' : 'bg-white/5 hover:bg-white/10'}`}
            >
              <div
                className={`w-full h-8 rounded ${coverPreviewClass()}`}
              />
              <span className="text-xs text-slate-300">Full</span>
            </button>
          </div>
        </div>
      )}

      {/* Colors */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Colors</p>
        <div className="grid grid-cols-5 gap-1.5">
          {COVER_COLORS.map(({ label, hex, textColor }) => (
            <button
              key={hex}
              title={label}
              onClick={() => setColor(hex, textColor)}
              className={`h-8 rounded transition-transform hover:scale-105 active:scale-95 ${cover.type === 'color' && cover.color === hex ? 'ring-2 ring-white ring-offset-1 ring-offset-[#282e33]' : ''} ${COVER_COLOR_CLASS[hex] ?? 'bg-slate-600'}`}
            />
          ))}
        </div>
      </div>

      {/* Gradient photos */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Photos</p>
        <div className="grid grid-cols-3 gap-1.5">
          {COVER_GRADIENTS.map((gradient) => (
            <button
              key={gradient}
              onClick={() => setGradient(gradient)}
              className={`h-10 rounded transition-transform hover:scale-105 active:scale-95 ${cover.type === 'image' && cover.image === gradient ? 'ring-2 ring-white ring-offset-1 ring-offset-[#282e33]' : ''} ${COVER_GRADIENT_CLASS[gradient] ?? 'bg-slate-600'}`}
              title="Set photo cover"
              aria-label="Set photo cover"
            />
          ))}
        </div>
      </div>

      {/* Remove */}
      {cover.type !== 'none' && (
        <button
          onClick={removeCover}
          className="text-sm text-slate-300 hover:bg-white/10 w-full text-left p-2 rounded transition-colors"
        >
          Remove cover
        </button>
      )}
    </div>
  );
}
