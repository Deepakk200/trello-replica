'use client';

import { useEffect, useRef, useState } from 'react';
import { Filter, X, Eye, EyeOff, Bookmark, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { DueFilter, ID, LabelColor } from '@/types';
import { LABEL_BG } from '@/lib/colors';
import { activeFilterCount } from '@/lib/card-filter';

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'none',     label: 'No dates' },
  { value: 'overdue',  label: 'Overdue' },
  { value: 'next24h',  label: 'Due in next 24h' },
  { value: 'nextweek', label: 'Due in next week' },
];

const COMPLETE_OPTIONS: { value: '' | 'complete' | 'incomplete'; label: string }[] = [
  { value: 'complete',   label: 'Marked complete' },
  { value: 'incomplete', label: 'Not complete' },
];

export function FilterBar({ boardId }: { boardId: ID }) {
  const [open, setOpen] = useState(false);
  const [savingName, setSavingName] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filterState = useBoardStore(useShallow((s) => s.filterState));
  const setFilter   = useBoardStore((s) => s.setFilter);
  const labels      = useBoardStore(useShallow((s) => Object.values(s.labels)));
  const members     = useBoardStore(useShallow((s) => {
    const ids = s.boards[boardId]?.memberIds ?? [];
    return ids.map((id) => s.members[id]).filter((m): m is NonNullable<typeof m> => !!m);
  }));
  const savedFilters = useBoardStore(useShallow((s) => s.savedFilters[boardId] ?? []));
  const saveCurrentFilter = useBoardStore((s) => s.saveCurrentFilter);
  const applySavedFilter  = useBoardStore((s) => s.applySavedFilter);
  const deleteSavedFilter = useBoardStore((s) => s.deleteSavedFilter);

  const activeCount = activeFilterCount(filterState);

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

  function clearAll() {
    setFilter({ search: '', labelIds: [], memberIds: [], dueFilter: '', complete: '' });
  }

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

      {/* Active bar: "Filters active (n) — Clear" */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 h-8 px-2 rounded text-sm text-white/70 hover:text-white hover:bg-black/20 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 w-80 max-h-[70vh] overflow-y-auto cards-scroll bg-trello-surfaceRaised rounded-lg shadow-2xl border border-trello-border p-3 z-50 flex flex-col gap-3 anim-popover-enter"
        >
          {/* Saved filters */}
          {savedFilters.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Saved filters</p>
              <div className="flex flex-col gap-1">
                {savedFilters.map((sf) => (
                  <div key={sf.id} className="flex items-center gap-1 group">
                    <button
                      onClick={() => applySavedFilter(boardId, sf.id)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm text-trello-textSecondary hover:text-trello-text hover:bg-white/5 text-left transition-colors"
                    >
                      <Bookmark className="w-3.5 h-3.5 shrink-0" /> {sf.name}
                    </button>
                    <button
                      onClick={() => deleteSavedFilter(boardId, sf.id)}
                      aria-label={`Delete saved filter ${sf.name}`}
                      className="h-7 w-7 rounded flex items-center justify-center text-trello-textSubtle hover:text-trello-danger hover:bg-red-500/15 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-white/10" />
            </div>
          )}

          {/* Keyword */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Keyword</p>
            <input
              autoFocus
              type="text"
              placeholder="Filter by title…"
              value={filterState.search}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle transition-colors"
            />
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Members</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const active = filterState.memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        const next = active
                          ? filterState.memberIds.filter((id) => id !== m.id)
                          : [...filterState.memberIds, m.id];
                        setFilter({ memberIds: next });
                      }}
                      title={m.name}
                      className={`flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                        active ? 'ring-2 ring-trello-accent bg-white/10 text-trello-text' : 'text-trello-textSecondary hover:bg-white/5'
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: m.color }}>
                        {m.initials}
                      </span>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  <span className="text-sm text-trello-textSecondary group-hover:text-trello-text transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Completion status — its own AND dimension */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5">Card status</p>
            <div className="flex flex-col gap-1.5">
              {COMPLETE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="complete-filter"
                    checked={filterState.complete === value}
                    onChange={() => setFilter({ complete: value })}
                    onClick={() => { if (filterState.complete === value) setFilter({ complete: '' }); }}
                    className="accent-trello-accent"
                  />
                  <span className="text-sm text-trello-textSecondary group-hover:text-trello-text transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Dim vs hide toggle */}
          <button
            onClick={() => setFilter({ mode: filterState.mode === 'dim' ? 'hide' : 'dim' })}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-trello-textSecondary hover:text-trello-text hover:bg-white/5 transition-colors"
          >
            {filterState.mode === 'hide' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {filterState.mode === 'hide' ? 'Hiding non-matching cards' : 'Dimming non-matching cards'}
            <span className="ml-auto text-xs text-trello-textSubtle">{filterState.mode === 'hide' ? 'Hide' : 'Dim'}</span>
          </button>

          {/* Save current filter */}
          {activeCount > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Name this filter…"
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && savingName.trim()) { saveCurrentFilter(boardId, savingName.trim()); setSavingName(''); }
                }}
                className="flex-1 bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle transition-colors"
              />
              <button
                onClick={() => { if (savingName.trim()) { saveCurrentFilter(boardId, savingName.trim()); setSavingName(''); } }}
                disabled={!savingName.trim()}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
