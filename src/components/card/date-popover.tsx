'use client';

import { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function toTimeInput(iso: string | null): string {
  if (!iso || iso.length < 16) return '';
  return iso.slice(11, 16);
}

export function DatePopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const updateCard = useBoardStore((s) => s.updateCard);
  const pushActivity = useBoardStore((s) => s.pushActivity);

  const [datePart, setDatePart] = useState(toDateInput(card?.dueDate ?? null));
  const [timePart, setTimePart] = useState(toTimeInput(card?.dueDate ?? null));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!card) return null;

  function save() {
    if (!datePart) return;
    const iso = timePart
      ? `${datePart}T${timePart}:00.000Z`
      : `${datePart}T00:00:00.000Z`;
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(iso));
    updateCard(cardId, { dueDate: iso });
    pushActivity(cardId, { type: 'due', text: `set this card to be due ${formatted}` });
    onClose();
  }

  function remove() {
    updateCard(cardId, { dueDate: null });
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 w-64 bg-[#282e33] rounded-lg shadow-xl border border-white/10 z-60 p-4 flex flex-col gap-3"
    >
      <p className="text-xs font-semibold text-center text-slate-400">Dates</p>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Due date</label>
        <input
          type="date"
          title="Due date"
          className="w-full bg-white/10 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-500 text-white scheme-dark"
          value={datePart}
          onChange={(e) => setDatePart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-400">Due time (optional)</label>
        <input
          type="time"
          title="Due time"
          className="w-full bg-white/10 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-500 text-white scheme-dark"
          value={timePart}
          onChange={(e) => setTimePart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={save}
          disabled={!datePart}
          className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          Save
        </button>
        {card.dueDate && (
          <button
            onClick={remove}
            className="w-full py-1.5 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded text-sm transition-colors"
          >
            Remove
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-1.5 hover:bg-white/10 text-slate-400 rounded text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
