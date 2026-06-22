'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { boardStore, useHasHydrated } from '@/store/use-board-store';
import { loadLegacyState, saveLegacyState } from '@/features/legacy-sync/actions';
import { getActiveWorkspaceName } from '@/features/workspaces/actions';
import type { LegacySnapshot } from '@/features/legacy-sync/types';
import { useSyncStatus } from '@/store/use-sync-status';

const DEBOUNCE_MS = 800;

/**
 * Sub-phase 1c bridge: makes the legacy localStorage board store persist through
 * the existing Prisma + server-action stack (no schema change).
 *
 *  - On login (once localStorage has rehydrated), pull the user's board graph
 *    from Postgres and apply it — the DB wins over the local cache. Because the
 *    DB load is a network round-trip it always resolves *after* the synchronous
 *    localStorage rehydrate, so it lands last.
 *  - When the DB is empty (first-ever sync), keep the local seed and immediately
 *    push it up — a one-time import of any existing local boards.
 *  - Thereafter, debounce-save the board-data slice back to the DB on change.
 *
 * The store itself and all ~70 of its mutations are left untouched.
 */
export function LegacyDbSync() {
  const { data: session, status } = useSession();
  const hasHydrated = useHasHydrated();
  const userId = session?.user?.id ?? null;

  const userIdRef = useRef<string | null>(null);
  const appliedFor = useRef<string | null>(null);
  const ready = useRef(false);
  const saving = useRef(false);
  const dirty = useRef(false);
  // Once a save reports the DB isn't configured, stop scheduling further saves
  // (localStorage-only mode) so we don't churn failing requests every change.
  const syncUnavailable = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  // ── Saver: subscribe once; persist the board-data slice when it changes ─────
  useEffect(() => {
    function snapshot(): LegacySnapshot {
      const s = boardStore.getState();
      return { boards: s.boards, lists: s.lists, cards: s.cards, labels: s.labels };
    }
    async function flush() {
      if (!userIdRef.current) return;
      if (saving.current) { dirty.current = true; return; }
      saving.current = true;
      dirty.current = false;
      useSyncStatus.getState().setStatus('saving');
      try {
        const res = await saveLegacyState(snapshot());
        if (res?.skipped) {
          // DB sync isn't configured (localStorage-only mode). Not an error —
          // stop showing any sync state and don't keep retrying.
          syncUnavailable.current = true;
          useSyncStatus.getState().setStatus('idle');
        } else if (!dirty.current) {
          // Don't overwrite a newer 'saving' if a change landed mid-flush.
          useSyncStatus.getState().setStatus('saved');
        }
      } catch {
        // Real transient failure (DB reachable but the write failed). Surface it
        // QUIETLY via the subtle bottom-left SyncIndicator (with a Retry) — NOT a
        // toast on every change. Data is safe in localStorage either way.
        useSyncStatus.getState().setStatus('error', () => { void flush(); });
      } finally {
        saving.current = false;
        if (dirty.current) schedule();
      }
    }
    function schedule() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { void flush(); }, DEBOUNCE_MS);
    }
    flushRef.current = flush;

    const unsub = boardStore.subscribe((s, p) => {
      if (!ready.current || !userIdRef.current || syncUnavailable.current) return;
      if (s.boards === p.boards && s.lists === p.lists && s.cards === p.cards && s.labels === p.labels) return;
      dirty.current = true;
      schedule();
    });
    const onHide = () => { if (ready.current && dirty.current) void flush(); };
    document.addEventListener('visibilitychange', onHide);
    // Re-sync on reconnect: a failed/queued save flushes as soon as we're back
    // online (network errors set `dirty`, so this picks up where we left off).
    const onOnline = () => { if (ready.current && (dirty.current || useSyncStatus.getState().status === 'error')) void flush(); };
    window.addEventListener('online', onOnline);

    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('online', onOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // ── Loader: hydrate from the DB once per signed-in user, after rehydrate ────
  useEffect(() => {
    userIdRef.current = userId;

    if (status !== 'authenticated' || !userId) {
      // Signed out: stop syncing (the local store keeps working on the base key).
      ready.current = false;
      appliedFor.current = null;
      return;
    }
    if (!hasHydrated) return;            // wait for localStorage rehydrate
    if (appliedFor.current === userId) return;
    appliedFor.current = userId;
    ready.current = false;

    let cancelled = false;
    (async () => {
      let snap: LegacySnapshot | null = null;
      try {
        snap = await loadLegacyState();
      } catch {
        snap = null;
      }
      if (cancelled) return;

      if (snap && Object.keys(snap.boards).length > 0) {
        applyDbSnapshot(snap);
        ready.current = true;
      } else {
        // Nothing in the DB yet → import the current local boards once.
        ready.current = true;
        void flushRef.current();
      }

      // Canonical workspace name lives in the DB (edited via /settings or the
      // workspace home) — hydrate the legacy sidebar/home label from it so they
      // reflect the real saved name after refresh.
      try {
        const wsName = await getActiveWorkspaceName();
        if (!cancelled && wsName) boardStore.getState().setWorkspaceName(wsName);
      } catch {
        // DB unreachable — keep the local label.
      }
    })();

    return () => { cancelled = true; };
  }, [status, userId, hasHydrated]);

  return null;
}

/**
 * Apply a DB snapshot over the local store. Board data (lists/cards/labels) is
 * replaced wholesale; a few client-only bits are reconciled so the UI doesn't
 * regress on the user's primary device:
 *  - board.workspaceId is remapped to an active client workspace (the DB legacy
 *    workspace isn't part of the client `workspaces` map).
 *  - card.memberIds (fake seed members, not persisted) are carried over from the
 *    local card of the same id when present.
 *  - activeBoardId is repaired if it points at a board that's no longer present.
 */
function applyDbSnapshot(snap: LegacySnapshot) {
  const prev = boardStore.getState();
  const clientWs = prev.activeWorkspaceId ?? Object.keys(prev.workspaces)[0] ?? '';

  for (const b of Object.values(snap.boards)) {
    b.workspaceId = clientWs;
    if (!b.memberIds?.length) {
      const local = prev.boards[b.id];
      if (local?.memberIds?.length) b.memberIds = local.memberIds;
    }
  }
  for (const c of Object.values(snap.cards)) {
    if (!c.memberIds?.length) {
      const local = prev.cards[c.id];
      if (local?.memberIds?.length) c.memberIds = local.memberIds;
    }
  }

  const boardIds = Object.keys(snap.boards);
  const activeBoardId =
    prev.activeBoardId && snap.boards[prev.activeBoardId] ? prev.activeBoardId : (boardIds[0] ?? null);

  boardStore.setState({
    boards: snap.boards,
    lists: snap.lists,
    cards: snap.cards,
    labels: snap.labels,
    activeBoardId,
  });
}
