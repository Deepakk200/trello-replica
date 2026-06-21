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

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'No reminder' },
  { value: 'at',   label: 'At time of due date' },
  { value: '10m',  label: '10 minutes before' },
  { value: '1h',   label: '1 hour before' },
  { value: '1d',   label: '1 day before' },
];

export function DatePopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card         = useBoardStore((s) => s.cards[cardId]);
  const updateCard   = useBoardStore((s) => s.updateCard);
  const pushActivity = useBoardStore((s) => s.pushActivity);

  const [startPart, setStartPart] = useState(toDateInput(card?.startDate ?? null));
  const [datePart, setDatePart] = useState(toDateInput(card?.dueDate ?? null));
  const [timePart, setTimePart] = useState(toTimeInput(card?.dueDate ?? null));
  const [reminder, setReminder] = useState(card?.reminder ?? 'none');
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
    const startIso = startPart ? `${startPart}T00:00:00.000Z` : null;
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(iso));
    updateCard(cardId, { dueDate: iso, startDate: startIso, reminder: reminder === 'none' ? null : reminder });
    pushActivity(cardId, { type: 'due', text: `set this card to be due ${formatted}` });
    onClose();
  }

  function remove() {
    updateCard(cardId, { dueDate: null, startDate: null, reminder: null });
    onClose();
  }

  const inputClass =
    'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors';

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[60] bg-trello-surfaceRaised border-t border-trello-border rounded-t-xl p-4 pb-safe+ flex flex-col gap-3 md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-1 md:w-64 md:rounded-lg md:shadow-xl md:border md:pb-4"
    >
      <div className="w-10 h-1 bg-trello-border rounded-full mx-auto mb-1 md:hidden" aria-hidden="true" />
      <p className="text-xs font-semibold text-center text-trello-textSubtle">Dates</p>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-trello-textSubtle">Start date (optional)</label>
        <input
          type="date"
          title="Start date"
          className={inputClass}
          value={startPart}
          max={datePart || undefined}
          onChange={(e) => setStartPart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-trello-textSubtle">Due date</label>
        <input
          type="date"
          title="Due date"
          className={inputClass}
          value={datePart}
          onChange={(e) => setDatePart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-trello-textSubtle">Due time (optional)</label>
        <input
          type="time"
          title="Due time"
          className={inputClass}
          value={timePart}
          onChange={(e) => setTimePart(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-trello-textSubtle">Reminder</label>
        <select
          title="Set a reminder"
          className={inputClass}
          value={reminder ?? 'none'}
          onChange={(e) => setReminder(e.target.value)}
        >
          {REMINDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          onClick={save}
          disabled={!datePart}
          className="btn-primary text-sm font-medium py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
        {card.dueDate && (
          <button
            onClick={remove}
            className="w-full py-1.5 hover:bg-red-500/20 text-trello-danger rounded text-sm transition-colors"
          >
            Remove
          </button>
        )}
        <button
          onClick={onClose}
          className="btn-ghost text-sm px-3 py-1.5 text-trello-textSubtle"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
