'use client';

import { useRef, useState } from 'react';
import { MoreHorizontal, Star, Users } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { Board } from '@/types';
import { BoardMenu } from './board-menu';
import { VisibilityBadge } from './visibility-badge';

export function BoardHeader({ board }: { board: Board }) {
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(board.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== board.title) renameBoard(board.id, trimmed);
    setEditing(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(board.title); setEditing(false); }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            className="bg-white text-slate-900 rounded px-1.5 py-0.5 font-bold text-sm outline-none w-48"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            onClick={startEdit}
            className="font-bold text-sm text-white hover:bg-white/10 rounded px-1.5 py-0.5 transition-colors"
          >
            {board.title}
          </button>
        )}

        <button className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-yellow-400" aria-label="Star board">
          <Star className="w-4 h-4" />
        </button>

        <VisibilityBadge boardId={board.id} />

        <div className="w-px h-4 bg-white/30" />

        <button className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Members">
          <Users className="w-4 h-4 text-white" />
        </button>

        <button className="h-8 px-4 rounded bg-white/90 hover:bg-white text-slate-900 text-sm font-semibold shadow-sm transition-colors">
          Share
        </button>

        <div className="w-px h-4 bg-white/30" />

        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 h-8 px-3 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          aria-label="Show menu"
        >
          <MoreHorizontal className="w-4 h-4" />
          Menu
        </button>
      </div>

      {showMenu && <BoardMenu boardId={board.id} onClose={() => setShowMenu(false)} />}
    </>
  );
}
