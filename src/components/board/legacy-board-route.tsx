'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/ui/app-shell';
import { BoardView } from '@/components/board/board-view';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ClientOnly } from '@/components/ui/client-only';
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

  // The legacy board shell is localStorage-backed, so SSR adds no value and only
  // creates a server/client HTML surface that browser extensions (e.g. ones that
  // stamp `fdprocessedid` on form controls) mutate before hydration — producing
  // benign hydration mismatches. Rendering the shell client-only removes that
  // surface entirely; the server emits only the skeleton.
  return (
    <ClientOnly fallback={<BoardShellSkeleton />}>
      <AppShell>
        <ErrorBoundary>
          <BoardView />
        </ErrorBoundary>
      </AppShell>
    </ClientOnly>
  );
}

function BoardShellSkeleton() {
  return (
    <div className="h-screen w-full flex flex-col" style={{ background: '#1D2125' }} aria-hidden>
      <div className="h-11 shrink-0 border-b border-white/[0.08] flex items-center gap-3 px-3">
        <div className="h-5 w-24 rounded bg-white/10 animate-pulse" />
        <div className="h-6 w-56 rounded bg-white/5 animate-pulse ml-auto" />
      </div>
      <div className="flex-1 flex gap-3 p-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[272px] shrink-0 rounded-xl bg-white/[0.04] animate-pulse h-48" />
        ))}
      </div>
    </div>
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
