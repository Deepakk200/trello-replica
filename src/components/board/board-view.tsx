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
import { CardModal } from '@/components/card/card-modal';
import { useShallow } from 'zustand/shallow';

const BOARD_BG_CLASSES: Record<string, string> = {
  'linear-gradient(135deg,#0079bf,#5067c5)': 'bg-[linear-gradient(135deg,#0079bf,#5067c5)]',
  'linear-gradient(135deg,#d29034,#e67e22)': 'bg-[linear-gradient(135deg,#d29034,#e67e22)]',
  'linear-gradient(135deg,#519839,#70a246)': 'bg-[linear-gradient(135deg,#519839,#70a246)]',
  'linear-gradient(135deg,#b04632,#e74c3c)': 'bg-[linear-gradient(135deg,#b04632,#e74c3c)]',
  'linear-gradient(135deg,#89609e,#8e44ad)': 'bg-[linear-gradient(135deg,#89609e,#8e44ad)]',
  'linear-gradient(135deg,#1d6fa4,#27ae60)': 'bg-[linear-gradient(135deg,#1d6fa4,#27ae60)]',
  '#1d6fa5': 'bg-[#1d6fa5]',
  '#4a235a': 'bg-[#4a235a]',
};

function boardBackgroundClass(background: string) {
  return BOARD_BG_CLASSES[background] ?? 'bg-trello-bg';
}

function BoardSkeleton() {
  return (
    <div className="h-full w-full pt-3 px-3 bg-[#1d2125]">
      <div className="h-8 w-48 rounded-md bg-white/10 animate-pulse mb-3" />
      <div className="flex gap-3 items-start">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-72 shrink-0 rounded-xl bg-[#101204]/80 animate-pulse">
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
      <div
        className={`h-full w-full flex flex-col ${boardBackgroundClass(board.background)}`}
      >
        {/* Fixed header: BoardHeader + ViewSwitcher */}
        <div className="pt-3 px-3 shrink-0">
          <BoardHeader board={board} />
          <ViewSwitcher boardId={board.id} />
        </div>

        {/* View content — takes remaining height */}
        <div
          className={`flex-1 min-h-0 px-3 pb-3 ${
            activeView === 'board'
              ? 'overflow-x-auto overflow-y-hidden'
              : 'overflow-hidden'
          }`}
        >
          {activeView === 'board' && (
            <>
              <FilterBar boardId={board.id} />
              {board.listIds.length === 0 && (
                <div className="flex items-center gap-2 text-white/60 text-sm mb-3 pl-1">
                  <span>Add your first list to get started</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
              <ListsRow board={board} />
            </>
          )}
          {activeView === 'calendar'  && <CalendarView  boardId={board.id} />}
          {activeView === 'table'     && <TableView     boardId={board.id} />}
          {activeView === 'dashboard' && <DashboardView boardId={board.id} />}
        </div>
      </div>
      {activeCardModalId && (
        <CardModal key={activeCardModalId} cardId={activeCardModalId} onClose={() => clearActiveCardModal()} />
      )}
    </>
  );
}
