'use client';

import { useEffect } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useSyncStatus } from '@/store/use-sync-status';

/**
 * Subtle bottom-left autosave indicator for the DB-backed legacy sync. Shows
 * "Saving…" while a save is in flight, a brief "Saved" confirmation, and a
 * persistent "Couldn't save — Retry" on failure. Hidden when idle, so it never
 * intrudes on the board.
 */
export function SyncIndicator() {
  const status = useSyncStatus((s) => s.status);
  const retry = useSyncStatus((s) => s.retry);
  const setStatus = useSyncStatus((s) => s.setStatus);

  // Auto-fade the "Saved" confirmation after a moment (errors + saving persist).
  useEffect(() => {
    if (status !== 'saved') return;
    const t = setTimeout(() => setStatus('idle'), 1800);
    return () => clearTimeout(t);
  }, [status, setStatus]);

  if (status === 'idle') return null;

  return (
    <div
      className="fixed bottom-3 left-3 z-[90] flex items-center gap-1.5 rounded-full bg-trello-surfaceOverlay/90 border border-trello-border shadow-lg px-3 py-1.5 text-xs text-trello-textSecondary backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      {status === 'saving' && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>)}
      {status === 'saved'  && (<><Check className="h-3.5 w-3.5 text-emerald-400" /> Saved</>)}
      {status === 'error'  && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          <span className="text-trello-text">Couldn&rsquo;t save</span>
          {retry && (
            <button onClick={retry} className="ml-1 font-semibold text-trello-accent hover:underline">Retry</button>
          )}
        </>
      )}
    </div>
  );
}
