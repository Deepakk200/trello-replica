'use client';

import { useEffect, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { DueFilter, ID, LabelColor } from '@/types';
import { LABEL_BG } from '@/lib/colors';

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'none',     label: 'No dates' },
  { value: 'overdue',  label: 'Overdue' },
  { value: 'next24h',  label: 'Due in next 24h' },
  { value: 'nextweek', label: 'Due in next week' },
  { value: 'complete', label: 'Complete' },
];

export function FilterBar({ boardId }: { boardId: ID }) {
  void boardId;
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filterState = useBoardStore(useShallow((s) => s.filterState));
  const setFilter   = useBoardStore((s) => s.setFilter);
  const labels      = useBoardStore(useShallow((s) => Object.values(s.labels)));

  const activeCount =
    (filterState.search ? 1 : 0) +
    filterState.labelIds.length +
    (filterState.dueFilter ? 1 : 0);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (
        open &&
        !popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative flex items-center gap-2">
      <button
        id="filter-trigger"
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors ${
          activeCount > 0
            ? 'bg-sky-500 hover:bg-sky-400 text-white'
            : 'bg-black/20 hover:bg-black/30 text-white'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="bg-white/25 text-white text-xs px-1.5 rounded-full font-bold leading-5">
            {activeCount}
          </span>
        )}
      </button>

      {activeCount > 0 && (
        <button
          onClick={() => setFilter({ search: '', labelIds: [], dueFilter: '' })}
          className="flex items-center gap-1 h-8 px-2 rounded text-sm text-white/70 hover:text-white hover:bg-black/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 w-72 bg-trello-surfaceRaised rounded-lg shadow-2xl border border-trello-border p-3 z-50 flex flex-col gap-3"
        >
          {/* Search */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Search</p>
            <input
              autoFocus
              type="text"
              placeholder="Filter by title…"
              value={filterState.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle transition-colors"
            />
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((label) => {
                  const active = filterState.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => {
                        const next = active
                          ? filterState.labelIds.filter((id) => id !== label.id)
                          : [...filterState.labelIds, label.id];
                        setFilter({ labelIds: next });
                      }}
                      className={`flex items-center px-2 py-1 rounded text-xs font-medium transition-all text-white ${LABEL_BG[label.color as LabelColor]} ${
                        active ? 'ring-2 ring-white/70 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {label.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Due date</p>
            <div className="flex flex-col gap-1.5">
              {DUE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="due-filter"
                    checked={filterState.dueFilter === value}
                    onChange={() => setFilter({ dueFilter: value })}
                    onClick={() => { if (filterState.dueFilter === value) setFilter({ dueFilter: '' }); }}
                    className="accent-trello-accent"
                  />
                  <span className="text-sm text-trello-textSecondary group-hover:text-trello-text transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
