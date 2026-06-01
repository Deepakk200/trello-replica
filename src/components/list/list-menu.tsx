'use client';

import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

interface Props { listId: ID; onClose: () => void; onAddCard: () => void; }

export function ListMenu({ listId, onClose, onAddCard }: Props) {
  const deleteList = useBoardStore((s) => s.deleteList);

  const items = [
    { label: 'Add card', action: onAddCard },
    { label: 'Copy list', action: onClose },
    { label: 'Move all cards', action: onClose },
    { label: 'Sort by…', action: onClose },
  ];

  return (
    <div className="absolute right-0 top-8 w-72 bg-trello-surfaceRaised rounded-lg shadow-xl border border-trello-border p-2 text-sm z-40">
      <p className="text-center text-xs text-white/50 pb-1.5 font-medium">List actions</p>

      {items.map(({ label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 transition-colors text-white/80 hover:text-white"
        >
          {label}
        </button>
      ))}

      <div className="my-1.5 border-t border-white/10" />

      <button
        onClick={() => { deleteList(listId); onClose(); }}
        className="w-full text-left px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors text-red-400 hover:text-red-300"
      >
        Delete this list
      </button>
    </div>
  );
}
