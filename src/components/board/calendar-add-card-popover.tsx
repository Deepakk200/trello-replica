'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

/** Quick-add popover for the Calendar view — mirrors Trello's "Add card" card. */
export function CalendarAddCardPopover({
  boardId,
  defaultDate,
  onClose,
  style,
}: {
  boardId: ID;
  defaultDate: Date;
  onClose: () => void;
  style?: React.CSSProperties;
}) {
  const nameRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const createCard = useBoardStore((s) => s.createCard);
  const updateCard = useBoardStore((s) => s.updateCard);

  // Lists on this board (stable records → derive in useMemo).
  const boards = useBoardStore((s) => s.boards);
  const listsById = useBoardStore((s) => s.lists);
  const lists = useMemo(() => {
    const board = boards[boardId];
    if (!board) return [] as { id: string; title: string }[];
    return board.listIds
      .map((lid) => listsById[lid])
      .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived)
      .map((l) => ({ id: l.id, title: l.title }));
  }, [boards, boardId, listsById]);

  const [name, setName] = useState('');
  const [listId, setListId] = useState<string>(lists[0]?.id ?? '');
  const [hasStart, setHasStart] = useState(false);
  const [startDate, setStartDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [hasDue, setHasDue] = useState(true);
  const [dueDate, setDueDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [dueTime, setDueTime] = useState('12:00');

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const canAdd = name.trim().length > 0 && !!listId;

  function submit() {
    if (!canAdd) return;
    const id = createCard(listId, name.trim());
    const patch: Parameters<typeof updateCard>[1] = {};
    if (hasDue && dueDate) {
      patch.dueDate = new Date(`${dueDate}T${dueTime || '12:00'}`).toISOString();
    }
    if (hasStart && startDate) {
      patch.startDate = new Date(`${startDate}T00:00`).toISOString();
    }
    if (Object.keys(patch).length > 0) updateCard(id, patch);
    onClose();
  }

  const field = 'w-full bg-[#22272B] border border-white/15 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-[#579DFF]';

  return (
    <div
      ref={rootRef}
      style={style}
      className="w-72 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl p-3 text-white"
      role="dialog"
      aria-label="Add card"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Add card</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/60" aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <textarea
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        placeholder="Enter a title for this card…"
        rows={2}
        className={`${field} resize-none mb-2`}
      />

      <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">List</label>
      <select value={listId} onChange={(e) => setListId(e.target.value)} className={`${field} mb-3`}>
        {lists.length === 0 && <option value="">No lists</option>}
        {lists.map((l) => (
          <option key={l.id} value={l.id} className="bg-[#22272B]">{l.title}</option>
        ))}
      </select>

      <label className="flex items-center gap-2 mb-1.5 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={hasStart} onChange={(e) => setHasStart(e.target.checked)} className="accent-[#579DFF]" />
        Start date
      </label>
      {hasStart && (
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${field} mb-3 [color-scheme:dark]`} />
      )}

      <label className="flex items-center gap-2 mb-1.5 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={hasDue} onChange={(e) => setHasDue(e.target.checked)} className="accent-[#579DFF]" />
        Due date
      </label>
      {hasDue && (
        <div className="flex gap-2 mb-3">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${field} flex-1 [color-scheme:dark]`} />
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={`${field} w-24 [color-scheme:dark]`} />
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canAdd}
        className="w-full bg-[#579DFF] hover:bg-[#85b8ff] disabled:opacity-40 disabled:cursor-not-allowed text-[#1D2125] text-sm font-semibold py-1.5 rounded transition-colors"
      >
        Add card
      </button>
    </div>
  );
}
