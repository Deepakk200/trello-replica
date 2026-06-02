'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Check, Layers, LayoutGrid, Table2, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { cn } from '@/lib/utils';
import type { Board, ID } from '@/types';

type View = 'board' | 'calendar' | 'table' | 'dashboard';
const VIEW_ORDER: View[] = ['board', 'calendar', 'table', 'dashboard'];

function ViewTab({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 relative whitespace-nowrap',
        active
          ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]',
      )}
    >
      <span className={cn(active ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]')}>{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {active && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-[var(--accent)]" />
      )}
    </button>
  );
}

function BoardRow({ board, active, onPick }: { board: Board; active: boolean; onPick: () => void }) {
  const wsName = useBoardStore((s) => s.workspaces[board.workspaceId]?.name ?? 'Workspace');
  return (
    <button
      onClick={onPick}
      className={cn(
        'flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-left transition-colors',
        active ? 'bg-[var(--accent)]/10' : 'hover:bg-white/[0.06]',
      )}
    >
      <div className="h-8 w-10 rounded shrink-0" style={{ background: board.background }} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', active ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)]')}>
          {board.title}
        </p>
        <p className="text-[11px] text-[var(--text-subtle)] truncate">{wsName}</p>
      </div>
      {active && <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />}
    </button>
  );
}

function BoardSwitcherOverlay({ onClose }: { onClose: () => void }) {
  const { boards, activeBoardId, starredBoardIds } = useBoardStore(
    useShallow((s) => ({
      boards: s.boards,
      activeBoardId: s.activeBoardId,
      starredBoardIds: s.starredBoardIds ?? [],
    })),
  );
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const [query, setQuery] = useState('');

  const { starred, all } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Object.values(boards).filter((b) => !q || b.title.toLowerCase().includes(q));
    return {
      starred: list.filter((b) => starredBoardIds.includes(b.id)),
      all: list,
    };
  }, [boards, starredBoardIds, query]);

  const pick = (id: ID) => { setActiveBoard(id); onClose(); };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Switch boards"
        className="fixed bottom-[120px] left-1/2 -translate-x-1/2 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden anim-slide-up"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Switch boards</h3>
          <button onClick={onClose} aria-label="Close" className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <X className="h-4 w-4 text-[var(--text-subtle)]" />
          </button>
        </div>

        <div className="px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards..."
            className="w-full h-8 rounded-lg bg-white/10 px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] border-none outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="max-h-[250px] overflow-y-auto px-2 pb-2">
          {starred.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-2 py-1.5">Starred</p>
              {starred.map((b) => (
                <BoardRow key={`star-${b.id}`} board={b} active={b.id === activeBoardId} onPick={() => pick(b.id)} />
              ))}
            </>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)] px-2 py-1.5 mt-1">All boards</p>
          {all.length === 0 ? (
            <p className="px-2 py-3 text-sm text-[var(--text-subtle)]">No boards found.</p>
          ) : (
            all.map((b) => (
              <BoardRow key={b.id} board={b} active={b.id === activeBoardId} onPick={() => pick(b.id)} />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function ViewNavigation({ boardId }: { boardId: ID }) {
  const activeView = useBoardStore((s) => s.activeViewByBoard[boardId] ?? 'board') as View;
  const setBoardView = useBoardStore((s) => s.setBoardView);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Keyboard 1–4 switch views (ignored while typing); Esc closes the switcher
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (e.key === 'Escape') { setSwitcherOpen(false); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        setBoardView(boardId, VIEW_ORDER[Number(e.key) - 1]);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [boardId, setBoardView]);

  return (
    <>
      {switcherOpen && <BoardSwitcherOverlay onClose={() => setSwitcherOpen(false)} />}

      {/* Floating pill — sits just above the global panel nav so the two don't overlap */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 bg-[var(--surface-raised)]/95 backdrop-blur-md border border-[var(--border-default)] rounded-2xl shadow-xl flex items-center p-1.5 gap-0.5 sm:gap-1 max-w-[calc(100vw-1rem)]">
        <ViewTab icon={<LayoutGrid className="h-[18px] w-[18px]" />} label="Board" active={activeView === 'board'} onClick={() => setBoardView(boardId, 'board')} />
        <ViewTab icon={<CalendarDays className="h-[18px] w-[18px]" />} label="Calendar" active={activeView === 'calendar'} onClick={() => setBoardView(boardId, 'calendar')} />
        <ViewTab icon={<Table2 className="h-[18px] w-[18px]" />} label="Table" active={activeView === 'table'} onClick={() => setBoardView(boardId, 'table')} />
        <ViewTab icon={<BarChart3 className="h-[18px] w-[18px]" />} label="Dashboard" active={activeView === 'dashboard'} onClick={() => setBoardView(boardId, 'dashboard')} />

        <div className="w-px h-6 bg-[var(--border-subtle)] mx-0.5 sm:mx-1" />

        <ViewTab icon={<Layers className="h-[18px] w-[18px]" />} label="Switch boards" active={switcherOpen} onClick={() => setSwitcherOpen((v) => !v)} />
      </div>
    </>
  );
}
