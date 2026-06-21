'use client';

import { create } from 'zustand';

/**
 * Tracks the DB-backed autosave (legacy-db-sync) so the UI can show a
 * saving… / saved / failed indicator and never fail silently. Ephemeral.
 */
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SyncState {
  status: SyncStatus;
  /** Optional retry for the last failed save (wired by the sync bridge). */
  retry: (() => void) | null;
  setStatus: (status: SyncStatus, retry?: (() => void) | null) => void;
}

export const useSyncStatus = create<SyncState>((set) => ({
  status: 'idle',
  retry: null,
  setStatus: (status, retry = null) => set({ status, retry }),
}));
