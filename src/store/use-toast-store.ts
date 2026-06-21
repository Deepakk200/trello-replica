'use client';

import { create } from 'zustand';

/**
 * The single app-wide toast system. One store, one renderer (`<Toaster/>`), used
 * for success / error / info feedback everywhere. Undo toasts keep their own
 * time-boxed store (`use-undo-store`) for the Ctrl+Z semantics but render through
 * the SAME `<Toaster/>` container, so placement / stacking / styling / a11y are
 * unified — there is no second toast UI.
 *
 * `notify.*` is importable from non-React modules (server-action callers, store
 * helpers) too, since it reads the store imperatively.
 */
export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
  /** Auto-dismiss after ms; 0 = sticky (until dismissed or retried). */
  duration: number;
  createdAt: number;
}

const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 3000,
  info: 4000,
  error: 6000,
};
const MAX_TOASTS = 4;

const timers = new Map<string, ReturnType<typeof setTimeout>>();

interface ToastState {
  toasts: Toast[];
  show: (t: { kind: ToastKind; message: string; action?: ToastAction; duration?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show({ kind, message, action, duration }) {
    const id = Math.random().toString(36).slice(2);
    // A retryable error stays put until acted on/dismissed, so the Retry button
    // doesn't vanish out from under the user.
    const ms = duration ?? (kind === 'error' && action ? 0 : DEFAULT_DURATION[kind]);
    set((s) => ({
      toasts: [...s.toasts, { id, kind, message, action, duration: ms, createdAt: Date.now() }].slice(-MAX_TOASTS),
    }));
    if (ms > 0) {
      timers.set(id, setTimeout(() => get().dismiss(id), ms));
    }
    return id;
  },
  dismiss(id) {
    const t = timers.get(id);
    if (t) { clearTimeout(t); timers.delete(id); }
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
  },
  clear() {
    timers.forEach((t) => clearTimeout(t));
    timers.clear();
    set({ toasts: [] });
  },
}));

type NotifyOpts = { action?: ToastAction; duration?: number };

export const notify = {
  success: (message: string, opts?: NotifyOpts) => useToastStore.getState().show({ kind: 'success', message, ...opts }),
  error:   (message: string, opts?: NotifyOpts) => useToastStore.getState().show({ kind: 'error', message, ...opts }),
  info:    (message: string, opts?: NotifyOpts) => useToastStore.getState().show({ kind: 'info', message, ...opts }),
};
