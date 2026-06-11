'use client';

import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useBoardStore, useHasHydrated } from '@/store/use-board-store';
import { BoardHeader } from './board-header';
import { ListsRow } from './lists-row';
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

  const visibleListCount = useBoardStore((s) => {
    const id = s.activeBoardId ?? Object.keys(s.boards)[0] ?? null;
    const b = id ? s.boards[id] : null;
    return b ? b.listIds.filter((lid) => !s.lists[lid]?.isArchived).length : 0;
  });

  const listScrollRef = useRef<HTMLDivElement>(null);
  const [listIndex, setListIndex] = useState(0);

  function handleListScroll() {
    const el = listScrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setListIndex(Math.max(0, Math.min(idx, visibleListCount - 1)));
  }

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
        {/* Unified header — single row (title, view tabs, filters, members, share, menu) */}
        <div className="px-3 pt-2 pb-2 shrink-0 relative z-10">
          <BoardHeader board={board} />
        </div>

        {/* View content — switches with activeView; keyed to re-trigger the enter animation.
            Extra bottom padding clears the floating view-navigation pill. */}
        <div key={activeView} className="flex-1 min-h-0 flex flex-col animate-view-enter">
          {activeView === 'board' && (
            <>
              {board.listIds.length === 0 && (
                <div className="px-4 shrink-0 pb-2 flex items-center gap-2 text-white/60 text-sm">
                  <span>Add your first list to get started</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
              <div
                ref={listScrollRef}
                onScroll={handleListScroll}
                className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 pb-28 max-md:snap-x max-md:snap-mandatory overscroll-x-contain"
                style={{ scrollBehavior: 'smooth' }}
              >
                <ListsRow board={board} />
              </div>

              {/* Mobile list carousel indicator */}
              {visibleListCount > 1 && (
                <div className="md:hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
                  {Array.from({ length: visibleListCount }, (_, i) => (
                    <button
                      key={i}
                      aria-label={`Go to list ${i + 1}`}
                      onClick={() => listScrollRef.current?.scrollTo({ left: i * (listScrollRef.current?.clientWidth ?? 0), behavior: 'smooth' })}
                      className={`h-1.5 rounded-full transition-all duration-200 ${i === listIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeView === 'calendar' && (
            <div className="flex-1 min-h-0 overflow-auto px-3 pb-28">
              <CalendarView boardId={board.id} />
            </div>
          )}
          {activeView === 'table' && (
            <div className="flex-1 min-h-0 overflow-auto pb-28">
              <TableView boardId={board.id} />
            </div>
          )}
          {activeView === 'dashboard' && (
            <div className="flex-1 min-h-0 overflow-auto px-3 pb-28">
              <DashboardView boardId={board.id} />
            </div>
          )}
        </div>
      </div>

      {activeCardModalId && (
        <ErrorBoundary fallback={null}>
          <CardModal key={activeCardModalId} cardId={activeCardModalId} onClose={clearActiveCardModal} />
        </ErrorBoundary>
      )}
    </>
  );
}
