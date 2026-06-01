'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { boardStore } from '@/store/use-board-store';

const SHORTCUTS = [
  { key: '?',        desc: 'Show this menu' },
  { key: 'Esc',      desc: 'Close modal / cancel edit' },
  { key: 'Enter',    desc: 'Open focused card' },
  { key: 'Space',    desc: 'Pick up / drop during drag' },
  { key: '↑ ↓ ← →', desc: 'Move during drag' },
  { key: 'N',        desc: 'Add card to focused list' },
  { key: 'B',        desc: 'Toggle sidebar' },
  { key: 'F',        desc: 'Open filters' },
];

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (e.key === '?' && !typing) { setOpen((v) => !v); return; }
      if (e.key === 'Escape')        { setOpen(false); return; }
      if (!typing && (e.key === 'b' || e.key === 'B')) { boardStore.getState().toggleSidebar(); return; }
      if (!typing && (e.key === 'f' || e.key === 'F')) { document.getElementById('filter-trigger')?.click(); return; }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-130 max-w-[95vw] bg-trello-surfaceRaised rounded-xl shadow-2xl p-6 z-50 text-trello-text"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="shortcuts-title" className="text-lg font-semibold">Keyboard shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Close shortcuts"
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="shrink-0 font-mono text-xs bg-trello-cardBg border border-trello-border text-trello-text px-2 py-0.5 rounded min-w-8 text-center">
                {key}
              </kbd>
              <span className="text-sm text-slate-300">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-5 text-center">Shortcuts are disabled while typing in inputs</p>
      </div>
    </>,
    document.body,
  );
}
