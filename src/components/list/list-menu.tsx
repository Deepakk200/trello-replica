'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

interface Props { listId: ID; onClose: () => void; onAddCard: () => void; }

export function ListMenu({ listId, onClose, onAddCard }: Props) {
  const list        = useBoardStore((s) => s.lists[listId]);
  const archiveList = useBoardStore((s) => s.archiveList);
  const sortList    = useBoardStore((s) => s.sortList);
  const copyList    = useBoardStore((s) => s.copyList);
  const moveAllCards = useBoardStore((s) => s.moveAllCards);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const otherLists  = useBoardStore(useShallow((s) => {
    const board = activeBoardId ? s.boards[activeBoardId] : null;
    return (board?.listIds ?? [])
      .map((id) => s.lists[id])
      .filter((l) => l && l.id !== listId && !l.isArchived);
  }));

  const [showSort, setShowSort]       = useState(false);
  const [showMoveAll, setShowMoveAll] = useState(false);
  const [watched, setWatched]         = useState(false);

  if (!list) return null;

  const SORT_OPTIONS = [
    { label: 'Date created (newest)', by: 'created-desc' as const },
    { label: 'Date created (oldest)', by: 'created-asc'  as const },
    { label: 'Card name (A–Z)',       by: 'name'          as const },
    { label: 'Due date',              by: 'due'           as const },
  ];

  const btn = 'w-full text-left px-3 py-1.5 rounded hover:bg-white/10 transition-colors text-trello-textSecondary hover:text-trello-text text-sm';
  const danger = 'w-full text-left px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors text-trello-danger text-sm';

  return (
    <div className="absolute right-0 top-8 w-72 bg-trello-surfaceRaised rounded-lg shadow-xl border border-trello-border p-2 text-sm z-40">
      <p className="text-center text-xs text-trello-textSubtle pb-1.5 font-medium">List actions</p>

      <button className={btn} onClick={() => { onAddCard(); onClose(); }}>Add card</button>

      <button className={btn} onClick={() => { setWatched((v) => !v); }}>
        {watched ? '✓ Watching' : 'Watch'}
      </button>

      <div className="my-1.5 border-t border-white/10" />

      {/* Sort sub-menu */}
      <button className={btn} onClick={() => { setShowSort((v) => !v); setShowMoveAll(false); }}>
        Sort by…
      </button>
      {showSort && (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          {SORT_OPTIONS.map(({ label, by }) => (
            <button
              key={by}
              className={btn + ' text-xs'}
              onClick={() => { sortList(listId, by); onClose(); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="my-1.5 border-t border-white/10" />

      <button className={btn} onClick={() => { copyList(listId); onClose(); }}>
        Copy list
      </button>

      {/* Move all cards sub-menu */}
      <button className={btn} onClick={() => { setShowMoveAll((v) => !v); setShowSort(false); }}>
        Move all cards in this list
      </button>
      {showMoveAll && (
        <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
          {otherLists.length === 0 ? (
            <p className="px-3 py-1 text-xs text-trello-textSubtle italic">No other lists</p>
          ) : otherLists.map((l) => (
            <button
              key={l.id}
              className={btn + ' text-xs'}
              onClick={() => { moveAllCards(listId, l.id); onClose(); }}
            >
              {l.title}
            </button>
          ))}
        </div>
      )}

      <div className="my-1.5 border-t border-white/10" />

      <button className={danger} onClick={() => { archiveList(listId); onClose(); }}>
        Archive this list
      </button>
    </div>
  );
}
