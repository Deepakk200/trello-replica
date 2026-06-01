'use client';

import { ArrowRight } from 'lucide-react';
import { useBoardStore, useHasHydrated } from '@/store/use-board-store';
import { BoardHeader } from './board-header';
import { FilterBar } from './filter-bar';
import { ListsRow } from './lists-row';
import { ViewSwitcher } from './view-switcher';
import { CalendarView } from './calendar-view';
import { TableView } from './table-view';
import { DashboardView } from './dashboard-view';
import { ShortcutsOverlay } from '@/components/ui/shortcuts-overlay';
import { CommandPalette } from '@/components/ui/command-palette';
import { NotificationsDrawer } from '@/components/ui/notifications-drawer';
import { BulkActionBar } from './bulk-action-bar';
import dynamic from 'next/dynamic';
const CardModal = dynamic(
  () => import('@/components/card/card-modal').then((m) => m.CardModal),
  { ssr: false },
);
import { useShallow } from 'zustand/shallow';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function BoardSkeleton() {
  return (
    <div className="h-full w-full pt-3 px-3 bg-trello-bg">
      <div className="h-8 w-48 rounded-md bg-white/10 animate-pulse mb-3" />
      <div className="flex gap-3 items-start">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-[272px] shrink-0 rounded-xl bg-trello-listBg/80 animate-pulse">
            <div className="h-8 mx-3 mt-2 mb-1 rounded bg-white/10" />
            {[1, 2].map((j) => (
              <div key={j} className="mx-2 mb-2 h-14 rounded-lg bg-white/10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardView() {
  const hydrated = useHasHydrated();

  const { activeCardModalId } = useBoardStore(
    useShallow((s) => ({ activeCardModalId: s.activeCardModalId })),
  );
  const clearActiveCardModal = useBoardStore((s) => s.clearActiveCardModal);

  const board = useBoardStore((s) => {
    const id = s.activeBoardId ?? Object.keys(s.boards)[0] ?? null;
    return id ? s.boards[id] : null;
  });

  const activeView = useBoardStore((s) => {
    const id = s.activeBoardId ?? Object.keys(s.boards)[0] ?? null;
    return (id ? s.activeViewByBoard[id] : null) ?? 'board';
  }) as 'board' | 'calendar' | 'table' | 'dashboard';

  if (!hydrated) return <BoardSkeleton />;

  if (!board) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm">
        No boards yet. Create one to get started.
      </div>
    );
  }

  return (
    <>
      <ShortcutsOverlay />
      <CommandPalette />
      <NotificationsDrawer />
      <BulkActionBar />

      {/* Board fills the remaining viewport height below the top-bar */}
      <div
        className="h-full w-full flex flex-col"
        style={{ background: board.background }}
      >
        {/* Unified header — title row + view/filter row in one z-10 stacking context */}
        <div className="px-3 pt-3 pb-2 shrink-0 relative z-10 flex flex-col gap-1.5">
          <BoardHeader board={board} />
          <div className="flex items-center gap-2">
            <ViewSwitcher boardId={board.id} />
            <div className="flex-1" />
            {activeView === 'board' && <FilterBar boardId={board.id} />}
          </div>
        </div>

        {/* Board view */}
        {activeView === 'board' && (
          <>
            {board.listIds.length === 0 && (
              <div className="px-4 shrink-0 pb-2 flex items-center gap-2 text-white/60 text-sm">
                <span>Add your first list to get started</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
            <div
              className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 pb-3 max-md:snap-x max-md:snap-mandatory overscroll-x-contain"
              style={{ scrollBehavior: 'smooth' }}
            >
              <ListsRow board={board} />
            </div>
          </>
        )}

        {activeView === 'calendar' && (
          <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3">
            <CalendarView boardId={board.id} />
          </div>
        )}
        {activeView === 'table' && (
          <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3">
            <TableView boardId={board.id} />
          </div>
        )}
        {activeView === 'dashboard' && (
          <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3">
            <DashboardView boardId={board.id} />
          </div>
        )}
      </div>

      {activeCardModalId && (
        <ErrorBoundary fallback={null}>
          <CardModal key={activeCardModalId} cardId={activeCardModalId} onClose={clearActiveCardModal} />
        </ErrorBoundary>
      )}
    </>
  );
}
