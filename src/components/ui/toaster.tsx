'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { useToastStore, type ToastKind } from '@/store/use-toast-store';
import { useUndoStore } from '@/store/use-undo-store';

/**
 * The single global toast surface. Renders the success/error/info stack
 * (`use-toast-store`) AND the time-boxed undo toast (`use-undo-store`) in ONE
 * bottom-centre column with consistent styling, stacking, auto-dismiss and a11y.
 * Mounted once in the root layout (replaces the old standalone UndoToast).
 */

const KIND: Record<ToastKind, { icon: React.ReactNode; ring: string; live: 'polite' | 'assertive'; role: 'status' | 'alert' }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, ring: 'border-emerald-500/30', live: 'polite',    role: 'status' },
  info:    { icon: <Info className="h-4 w-4 text-sky-400" />,            ring: 'border-sky-500/30',     live: 'polite',    role: 'status' },
  error:   { icon: <AlertCircle className="h-4 w-4 text-red-400" />,     ring: 'border-red-500/40',     live: 'assertive', role: 'alert'  },
};

const cardCls = 'pointer-events-auto flex items-center gap-2 rounded-lg bg-trello-surfaceOverlay border shadow-2xl pl-3 pr-2 py-2 text-sm text-trello-text min-w-64 max-w-[min(92vw,28rem)]';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  const undoEntry = useUndoStore((s) => s.entry);
  const runUndo = useUndoStore((s) => s.runUndo);
  const dismissUndo = useUndoStore((s) => s.dismiss);

  // Ctrl/Cmd+Z triggers undo while a live undo toast is showing (ignored when typing).
  useEffect(() => {
    if (!undoEntry) return;
    function onKey(e: KeyboardEvent) {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z')) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      runUndo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoEntry, runUndo]);

  if (typeof document === 'undefined') return null;
  if (toasts.length === 0 && !undoEntry) return null;

  return createPortal(
    <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => {
        const k = KIND[t.kind];
        return (
          <div key={t.id} role={k.role} aria-live={k.live} className={`anim-card-enter ${cardCls} ${k.ring}`}>
            {k.icon}
            <span className="flex-1 leading-snug">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold text-trello-accent hover:bg-trello-accent/15 transition-colors shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="p-1 rounded text-trello-textSubtle hover:text-trello-text hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      {undoEntry && (
        <div role="status" aria-live="polite" className={`anim-card-enter ${cardCls} border-trello-border`}>
          <span className="flex-1 font-medium leading-snug">{undoEntry.message}</span>
          <button
            onClick={runUndo}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold text-trello-accent hover:bg-trello-accent/15 transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            onClick={dismissUndo}
            aria-label="Dismiss"
            className="p-1 rounded text-trello-textSubtle hover:text-trello-text hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
