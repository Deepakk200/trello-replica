'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { useUndoStore } from '@/store/use-undo-store';

/**
 * Global toast for the last destructive action: "… archived — Undo".
 * Time-boxed by the undo store (~7s). Ctrl/Cmd+Z triggers undo while it's live
 * (ignored when typing). Mounted once in the root layout.
 */
export function UndoToast() {
  const entry = useUndoStore((s) => s.entry);
  const runUndo = useUndoStore((s) => s.runUndo);
  const dismiss = useUndoStore((s) => s.dismiss);

  useEffect(() => {
    if (!entry) return;
    function onKey(e: KeyboardEvent) {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      runUndo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, runUndo]);

  if (!entry || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="anim-card-enter fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-lg bg-trello-surfaceOverlay border border-trello-border shadow-2xl pl-4 pr-2 py-2 text-sm text-trello-text">
        <span className="font-medium">{entry.message}</span>
        <button
          onClick={runUndo}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold text-trello-accent hover:bg-trello-accent/15 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Undo
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 rounded text-trello-textSubtle hover:text-trello-text hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
