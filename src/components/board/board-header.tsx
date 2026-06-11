'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MoreHorizontal, SlidersHorizontal, Star, UserPlus } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { Board, DueFilter } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { BoardMenu } from './board-menu';
import { LABEL_VAR } from '@/lib/colors';

export function BoardHeader({ board }: { board: Board }) {
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const labels = useBoardStore((s) => s.labels);
  const filterState = useBoardStore((s) => s.filterState);
  const setFilter = useBoardStore((s) => s.setFilter);
  const boardLabels = Object.values(labels);
  const activeFilterCount = filterState.labelIds.length + (filterState.dueFilter ? 1 : 0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.title);
  const [showMenu, setShowMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  function toggleLabel(id: string) {
    const has = filterState.labelIds.includes(id);
    setFilter({ labelIds: has ? filterState.labelIds.filter((l) => l !== id) : [...filterState.labelIds, id] });
  }
  function setDue(due: DueFilter) {
    setFilter({ dueFilter: filterState.dueFilter === due ? '' : due });
  }
  function clearFilters() {
    setFilter({ labelIds: [], dueFilter: '', search: '' });
  }

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

  const iconBtn = 'h-7 px-1.5 rounded text-white/70 hover:text-white hover:bg-white/20 flex items-center transition-colors';

  return (
    <>
      <div className="flex items-center gap-1 h-11 flex-wrap">
        {/* Left: title + view switcher */}
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            className="bg-white text-slate-900 rounded px-1.5 py-0.5 font-bold text-base outline-none w-48"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            onClick={startEdit}
            className="font-bold text-base text-white hover:bg-white/20 rounded px-1.5 py-0.5 transition-colors"
          >
            {board.title}
          </button>
        )}

        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-1 rounded text-white/80 hover:text-white ml-1"
          aria-label="Board views"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="5" height="16" rx="1" />
            <rect x="6" y="0" width="4" height="10" rx="1" />
            <rect x="11" y="0" width="5" height="14" rx="1" />
          </svg>
          <ChevronDown size={12} />
        </button>

        {/* Right group */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Member avatars */}
          <div className="flex items-center -space-x-1.5">
            {board.memberIds.slice(0, 3).map((mid) => (
              <MemberAvatar key={mid} memberId={mid} size="sm" className="ring-2 ring-black/20" />
            ))}
          </div>

          {/* Filter */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`${iconBtn} gap-1 ${activeFilterCount > 0 ? 'bg-white/20 text-white' : ''}`}
              title="Filter"
            >
              <SlidersHorizontal size={14} />
              {activeFilterCount > 0 && (
                <span className="bg-[#0052CC] text-white text-[10px] font-bold rounded-full px-1.5 leading-4">{activeFilterCount}</span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 p-3 text-sm text-trello-text">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Filter cards</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-trello-accent hover:underline">Clear</button>
                  )}
                </div>

                <p className="text-[11px] uppercase tracking-wide text-trello-textSubtle mb-1.5">Labels</p>
                {boardLabels.length === 0 ? (
                  <p className="text-xs text-trello-textSubtle mb-2">No labels on this board.</p>
                ) : (
                  <div className="flex flex-col gap-1 mb-3">
                    {boardLabels.map((label) => {
                      const checked = filterState.labelIds.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-trello-cardHover transition-colors text-left"
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'border-trello-accent bg-trello-accent/20' : 'border-trello-border'}`}>
                            {checked && <span className="text-trello-accent text-[10px]">✓</span>}
                          </span>
                          <span className="h-3 w-8 rounded-sm shrink-0" style={{ backgroundColor: LABEL_VAR[label.color] }} />
                          <span className="text-xs text-trello-text truncate">{label.name || label.color}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] uppercase tracking-wide text-trello-textSubtle mb-1.5">Due date</p>
                <div className="flex flex-col gap-1">
                  {([
                    { v: 'overdue' as const, label: 'Overdue' },
                    { v: 'next24h' as const, label: 'Due in the next day' },
                    { v: 'none' as const, label: 'No due date' },
                  ]).map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setDue(v)}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-trello-cardHover transition-colors text-left"
                    >
                      <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${filterState.dueFilter === v ? 'border-trello-accent' : 'border-trello-border'}`}>
                        {filterState.dueFilter === v && <span className="h-1.5 w-1.5 rounded-full bg-trello-accent" />}
                      </span>
                      <span className="text-xs text-trello-text">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Star */}
          <button className={iconBtn} aria-label="Star board">
            <Star size={14} />
          </button>

          {/* Add member */}
          <button className={iconBtn} aria-label="Add member" title="Add member">
            <UserPlus size={14} />
          </button>

          {/* Share */}
          <button className="h-7 px-3 rounded border border-white/30 text-white text-sm hover:bg-white/10 transition-colors">
            Share
          </button>

          {/* More */}
          <button
            onClick={() => setShowMenu((v) => !v)}
            className={iconBtn}
            aria-label="Board menu"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {showMenu && <BoardMenu boardId={board.id} onClose={() => setShowMenu(false)} />}
    </>
  );
}
