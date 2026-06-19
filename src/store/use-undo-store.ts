'use client';

import { create } from 'zustand';

/**
 * Ephemeral undo stack for destructive actions (archive / close). A destructive
 * action calls `push(message, inverse)`; the toast shows for ~7s; `runUndo()`
 * applies the inverse. Not persisted — undo is a live, time-boxed affordance.
 */
export type UndoEntry = { id: string; message: string; undo: () => void };

const DURATION_MS = 7000;

interface UndoState {
  entry: UndoEntry | null;
  _timer: ReturnType<typeof setTimeout> | null;
  /** Show an undo toast for an action whose inverse is `undo`. */
  push: (message: string, undo: () => void) => void;
  /** Apply the current inverse and clear the toast. */
  runUndo: () => void;
  /** Dismiss without undoing. */
  dismiss: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  entry: null,
  _timer: null,
  push(message, undo) {
    const prev = get()._timer;
    if (prev) clearTimeout(prev);
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      if (get().entry?.id === id) set({ entry: null, _timer: null });
    }, DURATION_MS);
    set({ entry: { id, message, undo }, _timer: timer });
  },
  runUndo() {
    const { entry, _timer } = get();
    if (!entry) return;
    if (_timer) clearTimeout(_timer);
    entry.undo();
    set({ entry: null, _timer: null });
  },
  dismiss() {
    const t = get()._timer;
    if (t) clearTimeout(t);
    set({ entry: null, _timer: null });
  },
}));
