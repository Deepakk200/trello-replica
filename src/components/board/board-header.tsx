'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, MoreHorizontal, Plus, SlidersHorizontal, Star, Zap } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { Board, DueFilter } from '@/types';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { BoardMenu } from './board-menu';
import { VisibilityBadge } from './visibility-badge';
import { LABEL_VAR } from '@/lib/colors';

export function BoardHeader({ board }: { board: Board }) {
  const renameBoard = useBoardStore((s) => s.renameBoard);
  const labels = useBoardStore((s) => s.labels);
  const filterState = useBoardStore((s) => s.filterState);
  const setFilter = useBoardStore((s) => s.setFilter);
  const boardLabels = Object.values(labels);
  const activeFilterCount = filterState.labelIds.length + (filterState.dueFilter ? 1 : 0);

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.title);
  const [showMenu, setShowMenu] = useState(false);
  const [tool, setTool] = useState<'filter' | 'powerups' | 'automation' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close the tool popover on outside click
  useEffect(() => {
    if (!tool) return;
    function handler(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) setTool(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tool]);

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

        {/* Member avatar stack + invite */}
        <div className="flex items-center">
          {board.memberIds.slice(0, 3).map((mid, i) => (
            <div key={mid} className={i > 0 ? '-ml-1.5' : ''}>
              <MemberAvatar memberId={mid} size="sm" className="ring-2 ring-black/20" />
            </div>
          ))}
          <button
            aria-label="Invite members"
            title="Invite members"
            className={`${board.memberIds.length ? '-ml-1.5' : ''} h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors ring-2 ring-black/10`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Power-Ups · Automation · Filter (placeholder popovers) */}
        <div ref={toolbarRef} className="relative flex items-center gap-0.5">
          <button
            onClick={() => setTool((t) => (t === 'powerups' ? null : 'powerups'))}
            className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/20 px-2 py-1.5 rounded text-sm transition-colors"
            title="Power-Ups"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden lg:inline">Power-Ups</span>
          </button>
          <button
            onClick={() => setTool((t) => (t === 'automation' ? null : 'automation'))}
            className="flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/20 px-2 py-1.5 rounded text-sm transition-colors"
            title="Automation"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden lg:inline">Automation</span>
          </button>
          <button
            onClick={() => setTool((t) => (t === 'filter' ? null : 'filter'))}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm transition-colors ${activeFilterCount > 0 ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
            title="Filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden md:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-trello-primary text-white text-[10px] font-bold rounded-full px-1.5 leading-4">{activeFilterCount}</span>
            )}
          </button>

          {tool && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 p-3 text-sm text-trello-text">
              {tool === 'powerups' && (
                <>
                  <p className="font-semibold mb-1">Power-Ups</p>
                  <p className="text-trello-textSubtle text-xs">Power-Ups coming soon.</p>
                </>
              )}
              {tool === 'automation' && (
                <>
                  <p className="font-semibold mb-1">Automation</p>
                  <p className="text-trello-textSubtle text-xs">Rules, buttons, and scheduled commands — coming soon.</p>
                </>
              )}
              {tool === 'filter' && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>

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
