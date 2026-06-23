'use client';

// Trello-style "Create board" popover (Part B). Narrow dark surface with a live
// preview, background picker (photo-style gradients + color swatches), required
// title with inline validation, visibility dropdown, and a Create action that
// seeds To Do/Doing/Done (server-side) and navigates to the new board.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, ChevronDown } from 'lucide-react';
import { createBoard } from '@/features/boards/actions';

// "Photo" thumbnails (gradients — no external images, so no CSP/Unsplash fetch).
const PHOTOS = [
  'linear-gradient(135deg,#13284d 0%,#2a5db0 100%)',
  'linear-gradient(135deg,#0079bf 0%,#5067c5 100%)',
  'linear-gradient(160deg,#3a1c71 0%,#d76d77 60%,#ffaf7b 100%)',
  'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
];
const COLORS = [
  '#1d2125',
  'linear-gradient(135deg,#0079bf,#5067c5)',
  '#0052cc',
  'linear-gradient(135deg,#89609e,#cd5a91)',
  '#cd5a91',
];

const TrelloMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="20" rx="1.5" fill="white" />
    <rect x="16" y="4" width="8" height="12" rx="1.5" fill="white" />
  </svg>
);

export function CreateBoardDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [bg, setBg] = useState(PHOTOS[1]);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'public'>('workspace');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const titleEmpty = title.trim() === '';

  function submit() {
    if (titleEmpty || pending) return;
    setError(null);
    start(async () => {
      try {
        const res = await createBoard({ title: title.trim(), background: bg, visibility });
        if (res.ok && res.board) router.push(`/board/${res.board.id}`);
        else setError('Could not create board.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create board.');
      }
    });
  }

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create board"
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[304px] max-h-[92vh] overflow-y-auto rounded-lg bg-[#282E33] shadow-2xl border border-white/10 anim-popover-enter"
      >
        {/* Header */}
        <div className="relative flex items-center justify-center h-10 border-b border-white/[0.08]">
          <span className="text-sm font-semibold text-white/90">Create board</span>
          <button onClick={onClose} aria-label="Close" className="absolute right-1.5 top-1.5 p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          {/* Live preview */}
          <div className="mb-3 flex items-center justify-center">
            <div className="relative w-[200px] h-[120px] rounded-md overflow-hidden shadow-lg" style={{ background: bg }}>
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2"><TrelloMark size={16} /></div>
              <div className="absolute inset-x-3 bottom-2 flex gap-1.5">
                <div className="flex-1 h-12 rounded bg-white/85" />
                <div className="flex-1 h-9 rounded bg-white/85" />
                <div className="flex-1 h-6 rounded bg-white/85" />
              </div>
            </div>
          </div>

          {/* Background */}
          <p className="text-xs font-bold text-white/80 mb-1.5">Background</p>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {PHOTOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBg(p)}
                aria-label="Background option"
                aria-pressed={bg === p}
                className="relative h-10 rounded overflow-hidden focus-visible:outline-2 focus-visible:outline-[#579DFF]"
                style={{ background: p }}
              >
                {bg === p && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check size={16} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBg(c)}
                aria-label="Background color"
                aria-pressed={bg === c}
                className="relative h-7 w-7 rounded overflow-hidden focus-visible:outline-2 focus-visible:outline-[#579DFF]"
                style={{ background: c }}
              >
                {bg === c && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check size={13} className="text-white" />
                  </span>
                )}
              </button>
            ))}
            <button type="button" aria-label="More backgrounds" className="h-7 w-7 rounded flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 text-sm leading-none">⋯</button>
          </div>

          {/* Board title */}
          <label htmlFor="cb-title" className="block text-xs font-bold text-white/80 mb-1">
            Board title <span className="text-[#F87168]">*</span>
          </label>
          <input
            id="cb-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
            className={`w-full rounded bg-[#22272B] px-2.5 py-1.5 text-sm text-white outline-none border ${titleEmpty ? 'border-[#F87168] focus:border-[#F87168]' : 'border-white/20 focus:border-[#579DFF]'}`}
          />
          {titleEmpty && (
            <p className="mt-1 text-xs text-[#F87168]">👋 Board title is required</p>
          )}

          {/* Visibility */}
          <label htmlFor="cb-vis" className="block text-xs font-bold text-white/80 mt-3 mb-1">Visibility</label>
          <div className="relative">
            <select
              id="cb-vis"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              className="w-full appearance-none rounded bg-[#22272B] border border-white/20 px-2.5 py-1.5 pr-8 text-sm text-white outline-none focus:border-[#579DFF]"
            >
              <option value="private">Private</option>
              <option value="workspace">Workspace</option>
              <option value="public">Public</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50" />
          </div>

          {error && <p className="mt-2 text-xs text-[#F87168]" role="alert">{error}</p>}

          {/* Create */}
          <button
            onClick={submit}
            disabled={titleEmpty || pending}
            className="mt-4 w-full rounded py-1.5 text-sm font-medium bg-[#579DFF] text-[#1D2125] hover:bg-[#85B8FF] disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Creating…' : 'Create'}
          </button>

          {/* Start with a template */}
          <button
            onClick={() => router.push('/templates')}
            className="mt-2 w-full rounded py-1.5 text-sm font-medium bg-white/10 hover:bg-white/15 text-white/90 transition-colors"
          >
            Start with a template
          </button>

          {/* Unsplash fine print */}
          <p className="mt-3 text-[11px] leading-snug text-white/40">
            By using images from{' '}
            <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline hover:text-white/60">Unsplash</a>, you agree to their{' '}
            <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="underline hover:text-white/60">license</a> and{' '}
            <a href="https://unsplash.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-white/60">Terms of Service</a>.
          </p>
        </div>
      </div>
    </>
  );
}
