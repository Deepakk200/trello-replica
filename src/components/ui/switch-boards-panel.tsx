'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Star, Plus } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { Board } from '@/types';

export function SwitchBoardsPanel() {
  const open    = useBoardStore((s) => s.switchBoardsOpen);
  const setOpen = useBoardStore((s) => s.setSwitchBoardsOpen);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);

  const { boards, starredBoardIds } = useBoardStore(
    useShallow((s) => ({ boards: s.boards, starredBoardIds: s.starredBoardIds ?? [] })),
  );

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open || typeof document === 'undefined') return null;

  const all = Object.values(boards);
  const filtered = query.trim() ? all.filter((b) => b.title.toLowerCase().includes(query.toLowerCase())) : all;
  const starredSet = new Set(starredBoardIds);
  const starred = filtered.filter((b) => starredSet.has(b.id));
  const rest = filtered.filter((b) => !starredSet.has(b.id));

  function handleSelect(board: Board) {
    setActiveBoard(board.id);
    setOpen(false);
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />

      <div
        className="fixed right-0 top-0 h-full z-40 bg-[#1C2B41] text-white flex flex-col shadow-2xl
                   w-full sm:w-[320px] anim-slide-up duration-200"
        role="dialog"
        aria-label="Switch boards"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="font-semibold text-sm">Switch boards</span>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/10 text-white/60" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/10">
            <Search size={14} className="text-white/40 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find boards by name..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {starred.length > 0 && (
            <section className="mb-4">
              <div className="flex items-center gap-1.5 text-xs text-white/50 uppercase tracking-wide mb-2 px-1">
                <Star size={11} /> Starred boards
              </div>
              {starred.map((b) => <BoardRow key={b.id} board={b} starred onClick={() => handleSelect(b)} />)}
            </section>
          )}

          <section>
            <div className="text-xs text-white/50 uppercase tracking-wide mb-2 px-1">Your boards</div>
            {rest.map((b) => <BoardRow key={b.id} board={b} starred={false} onClick={() => handleSelect(b)} />)}
            {filtered.length === 0 && <p className="text-sm text-white/40 text-center py-4">No boards found</p>}
          </section>
        </div>

        <div className="px-3 py-3 border-t border-white/10">
          <button className="flex items-center gap-2 w-full text-sm text-white/70 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Create new board
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

function BoardRow({ board, starred, onClick }: { board: Board; starred: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
      <div className="w-8 h-6 rounded flex-shrink-0" style={{ background: board.background }} />
      <span className="text-sm text-white truncate">{board.title}</span>
      {starred && <Star size={12} className="ml-auto flex-shrink-0 text-yellow-400 fill-yellow-400" />}
    </button>
  );
}
