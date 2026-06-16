'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, LayoutGrid, Pin, Clock, ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { Board, ID } from '@/types';

const SYNTHETIC_WS = '__none__';

/**
 * Trello-style "Switch boards" popup (opened from the bottom dock).
 * Centered modal over a dark scrim: search + grid/pin toggles, workspace filter
 * pills, a Recent group, and collapsible per-workspace groups of board rows.
 * Reuses the real store boards/workspaces/recent — no mock data.
 *
 * The dialog is split out so it only mounts while open: its local UI state
 * (search/filters/collapse) is therefore fresh on every open with no reset effect.
 */
export function SwitchBoardsPopup() {
  const open = useBoardStore((s) => s.switchBoardsOpen);
  if (!open || typeof document === 'undefined') return null;
  return <SwitchBoardsDialog />;
}

function SwitchBoardsDialog() {
  const router = useRouter();
  const setOpen = useBoardStore((s) => s.setSwitchBoardsOpen);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);

  const { boards, workspaces, recentBoardIds, starredBoardIds } = useBoardStore(
    useShallow((s) => ({
      boards: s.boards,
      workspaces: s.workspaces,
      recentBoardIds: s.recentBoardIds ?? [],
      starredBoardIds: s.starredBoardIds ?? [],
    })),
  );

  const [query, setQuery] = useState('');
  const [activeWs, setActiveWs] = useState<ID | 'all'>('all');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [gridActive, setGridActive] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const allBoards = Object.values(boards);
  const starredSet = new Set(starredBoardIds);
  const q = query.trim().toLowerCase();

  const matches = (b: Board) =>
    (!q || b.title.toLowerCase().includes(q)) && (!pinnedOnly || starredSet.has(b.id));

  function openBoard(id: ID) {
    setActiveBoard(id);
    router.push('/b');
    setOpen(false);
  }

  // Workspace pills: only workspaces that actually contain boards (+ "All").
  const pillWorkspaces = Object.values(workspaces).filter((ws) =>
    allBoards.some((b) => b.workspaceId === ws.id),
  );

  // Recent group — real recent boards, respecting search / pin / workspace filters.
  const recentBoards = recentBoardIds
    .map((id) => boards[id])
    .filter((b): b is Board => Boolean(b))
    .filter((b) => matches(b) && (activeWs === 'all' || b.workspaceId === activeWs));

  // Workspace groups (each filtered) — synthetic bucket for orphan boards.
  const wsIds = new Set(Object.keys(workspaces));
  const groupDefs: { id: string; name: string; boards: Board[] }[] = [
    ...Object.values(workspaces).map((ws) => ({
      id: ws.id,
      name: ws.name,
      boards: allBoards.filter((b) => b.workspaceId === ws.id && matches(b)),
    })),
    {
      id: SYNTHETIC_WS,
      name: 'Your boards',
      boards: allBoards.filter((b) => !wsIds.has(b.workspaceId) && matches(b)),
    },
  ];
  const visibleGroups = groupDefs.filter(
    (g) => g.boards.length > 0 && (activeWs === 'all' || g.id === activeWs),
  );

  const totalShown = recentBoards.length + visibleGroups.reduce((n, g) => n + g.boards.length, 0);

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
      active ? 'text-[#579DFF] bg-[#579DFF]/15' : 'text-white/70 hover:bg-white/10'
    }`;

  const iconBtnClass = (active: boolean) =>
    `w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
      active
        ? 'text-[#579DFF] bg-[#579DFF]/15 border-[#579DFF]/30'
        : 'text-white/70 border-white/10 hover:bg-white/10'
    }`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-backdrop-enter"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Switch boards"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[620px] bg-[#282E33] rounded-xl shadow-2xl border border-white/10 p-5 anim-modal-enter flex flex-col max-h-[80vh]"
      >
        {/* Header: search + grid/pin toggles */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your boards"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#579DFF] outline-none"
            />
          </div>
          <button
            type="button"
            title="Board view"
            aria-pressed={gridActive}
            onClick={() => setGridActive((v) => !v)}
            className={iconBtnClass(gridActive)}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            title="Pinned"
            aria-pressed={pinnedOnly}
            onClick={() => setPinnedOnly((v) => !v)}
            className={iconBtnClass(pinnedOnly)}
          >
            <Pin size={16} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => setActiveWs('all')} className={pillClass(activeWs === 'all')}>
            All
          </button>
          {pillWorkspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => setActiveWs(ws.id)}
              className={pillClass(activeWs === ws.id)}
            >
              {ws.name}
            </button>
          ))}
        </div>

        {/* Sections */}
        <div className="mt-4 -mx-1 px-1 overflow-y-auto scrollbar-thin">
          {totalShown === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No boards found</p>
          ) : (
            <>
              {recentBoards.length > 0 && (
                <section className="mb-2">
                  <div className="flex items-center gap-2 text-xs text-white/50 px-1 py-2">
                    <Clock size={14} /> Recent
                  </div>
                  {recentBoards.map((b) => (
                    <BoardRow key={`recent-${b.id}`} board={b} onClick={() => openBoard(b.id)} />
                  ))}
                </section>
              )}

              {visibleGroups.map((g) => {
                const isCollapsed = collapsed[g.id];
                return (
                  <section key={g.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                      className="flex items-center gap-2 text-sm text-white/70 px-1 py-2 w-full hover:text-white transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                      {g.name}
                    </button>
                    {!isCollapsed &&
                      g.boards.map((b) => (
                        <BoardRow key={`${g.id}-${b.id}`} board={b} onClick={() => openBoard(b.id)} />
                      ))}
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BoardRow({ board, onClick }: { board: Board; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left hover:bg-[#579DFF]/15 transition-colors"
    >
      <span className="w-7 h-7 rounded flex-shrink-0 bg-cover bg-center" style={{ background: board.background }} />
      <span className="text-sm text-white truncate">{board.title}</span>
    </button>
  );
}
