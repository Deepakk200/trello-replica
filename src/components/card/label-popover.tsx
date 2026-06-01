'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID, LabelColor } from '@/types';

const LABEL_COLORS: LabelColor[] = [
  'green', 'yellow', 'orange', 'red', 'purple', 'blue', 'sky', 'lime', 'pink', 'black',
];

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function LabelPopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card           = useBoardStore((s) => s.cards[cardId]);
  const labels         = useBoardStore((s) => s.labels);
  const toggleCardLabel = useBoardStore((s) => s.toggleCardLabel);
  const upsertLabel    = useBoardStore((s) => s.upsertLabel);

  const [search, setSearch]     = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState<LabelColor>('green');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!card) return null;

  const filtered = Object.values(labels).filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()),
  );

  function createLabel() {
    const name = newName.trim();
    if (!name) return;
    upsertLabel({ id: genId(), name, color: newColor });
    setCreating(false);
    setNewName('');
  }

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[60] bg-trello-surfaceRaised border-t border-trello-border rounded-t-xl p-4 pb-safe+ flex flex-col gap-2 md:absolute md:inset-x-auto md:bottom-auto md:left-0 md:top-full md:mt-1 md:w-72 md:rounded-lg md:shadow-xl md:border md:p-3 md:pb-3"
    >
      <div className="w-10 h-1 bg-trello-border rounded-full mx-auto mb-1 md:hidden" aria-hidden="true" />
      <p className="text-xs font-semibold text-center text-trello-textSubtle">Labels</p>

      <input
        autoFocus
        className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle transition-colors"
        placeholder="Search labels…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
        {filtered.map((label) => {
          const applied = card.labelIds.includes(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggleCardLabel(cardId, label.id)}
              className="flex items-center gap-2 w-full rounded hover:bg-trello-cardHover px-1 py-0.5 transition-colors"
            >
              <span
                className="flex-1 h-8 rounded text-xs text-white font-medium flex items-center px-2"
                style={{ background: `var(--label-${label.color})` }}
              >
                {label.name}
              </span>
              {applied && <Check className="w-4 h-4 text-trello-text shrink-0" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-trello-textSubtle text-center py-2">No labels found</p>
        )}
      </div>

      {creating ? (
        <div className="flex flex-col gap-2 border-t border-trello-border pt-2">
          <input
            autoFocus
            className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle transition-colors"
            placeholder="Label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createLabel();
              if (e.key === 'Escape') setCreating(false);
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((color) => (
              <button
                key={color}
                title={color}
                onClick={() => setNewColor(color)}
                className={`w-7 h-5 rounded transition-transform ${newColor === color ? 'ring-2 ring-trello-accent scale-110' : 'hover:scale-105'}`}
                style={{ background: `var(--label-${color})` }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={createLabel}
              className="flex-1 btn-primary text-sm font-medium py-1.5"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="btn-ghost text-sm px-3 py-1.5 text-trello-textSubtle"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-center text-sm py-1.5 hover:bg-trello-cardHover rounded text-trello-textSubtle hover:text-trello-text transition-colors border-t border-trello-border"
        >
          Create a new label
        </button>
      )}
    </div>
  );
}
