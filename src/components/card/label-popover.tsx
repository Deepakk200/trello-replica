'use client';

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID, LabelColor } from '@/types';

const COLORS: Array<{ value: LabelColor; bg: string }> = [
  { value: 'green',  bg: 'bg-emerald-500' },
  { value: 'yellow', bg: 'bg-yellow-400'  },
  { value: 'orange', bg: 'bg-orange-400'  },
  { value: 'red',    bg: 'bg-red-500'     },
  { value: 'purple', bg: 'bg-purple-500'  },
  { value: 'blue',   bg: 'bg-blue-600'    },
  { value: 'sky',    bg: 'bg-cyan-400'    },
  { value: 'lime',   bg: 'bg-lime-400'    },
  { value: 'pink',   bg: 'bg-pink-400'    },
  { value: 'black',  bg: 'bg-slate-700'   },
];

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export function LabelPopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const labels = useBoardStore((s) => s.labels);
  const toggleCardLabel = useBoardStore((s) => s.toggleCardLabel);
  const upsertLabel = useBoardStore((s) => s.upsertLabel);

  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
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
      className="absolute left-0 top-full mt-1 w-72 bg-[#282e33] rounded-lg shadow-xl border border-white/10 z-60 p-3 flex flex-col gap-2"
    >
      <p className="text-xs font-semibold text-center text-slate-400">Labels</p>

      <input
        autoFocus
        className="w-full bg-white/10 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-white/40"
        placeholder="Search labels…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
        {filtered.map((label) => {
          const bg = COLORS.find((c) => c.value === label.color)?.bg ?? 'bg-slate-600';
          const applied = card.labelIds.includes(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggleCardLabel(cardId, label.id)}
              className="flex items-center gap-2 w-full rounded hover:bg-white/10 px-1 py-0.5 transition-colors"
            >
              <span className={`${bg} flex-1 h-8 rounded text-xs text-white font-medium flex items-center px-2`}>
                {label.name}
              </span>
              {applied && <Check className="w-4 h-4 text-white shrink-0" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-2">No labels found</p>
        )}
      </div>

      {creating ? (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
          <input
            autoFocus
            className="w-full bg-white/10 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-white/40"
            placeholder="Label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createLabel(); if (e.key === 'Escape') setCreating(false); }}
          />
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map(({ value, bg }) => (
              <button
                key={value}
                title={value}
                onClick={() => setNewColor(value)}
                className={`w-7 h-5 rounded transition-transform ${bg} ${newColor === value ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={createLabel}
              className="flex-1 py-1.5 bg-sky-500 hover:bg-sky-600 rounded text-sm font-medium transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-3 py-1.5 hover:bg-white/10 rounded text-sm text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-center text-sm py-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors border-t border-white/10"
        >
          Create a new label
        </button>
      )}
    </div>
  );
}
