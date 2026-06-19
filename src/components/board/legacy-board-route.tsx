'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/ui/app-shell';
import { BoardView } from '@/components/board/board-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useBoardStore, useHasHydrated } from '@/store/use-board-store';

/**
 * Board route wrapper for the legacy (localStorage) app.
 *
 * The board id lives in the URL (`/b/<boardId>` or `/b/<boardId>/<slug>`), which
 * makes boards directly accessible, refreshable, shareable and back-button-safe.
 * This component is the URL → store half of the sync: it adopts the URL's board
 * as the active board. The store → URL half (slug canonicalisation, secondary
 * switchers) lives in <BoardUrlSync/>, mounted inside <AppShell/>.
 *
 * If the id isn't present in this browser's local store (e.g. a link to someone
 * else's board — the legacy app is single-user localStorage), we show a clean
 * not-found instead of a blank board.
 */
export function LegacyBoardRoute({ boardId }: { boardId: string }) {
  const hydrated = useHasHydrated();
  const exists = useBoardStore((s) => Boolean(s.boards[boardId]));
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);

  // URL → store: make the URL's board the active one once it exists locally.
  useEffect(() => {
    if (!hydrated || !exists) return;
    if (activeBoardId !== boardId) setActiveBoard(boardId);
  }, [hydrated, exists, activeBoardId, boardId, setActiveBoard]);

  if (hydrated && !exists) return <BoardNotFound />;

  return (
    <AppShell>
      <ErrorBoundary>
        <BoardView />
      </ErrorBoundary>
    </AppShell>
  );
}

function BoardNotFound() {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: '#1D2125' }}
    >
      <h1 className="text-xl font-semibold text-white">Board not found</h1>
      <p className="max-w-sm text-sm text-white/60">
        This board isn&apos;t available on this device. It may have been deleted, or the link
        belongs to a different account.
      </p>
      <Link
        href="/"
        className="rounded bg-trello-primary px-4 py-2 text-sm font-medium text-trello-textOnBold hover:opacity-90"
      >
        Back to your boards
      </Link>
    </div>
  );
}
