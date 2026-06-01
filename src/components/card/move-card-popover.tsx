'use client';

import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function MoveCardPopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const card          = useBoardStore((s) => s.cards[cardId]);
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const lists         = useBoardStore(useShallow((s) => {
    const board = activeBoardId ? s.boards[activeBoardId] : null;
    return (board?.listIds ?? []).map((id) => s.lists[id]).filter(Boolean);
  }));
  const moveCard = useBoardStore((s) => s.moveCard);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  if (!card) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-56 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-50 py-1"
    >
      <p className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide px-3 pt-2 pb-1">
        Move to list
      </p>
      {lists.map((list) => {
        const isCurrent = list.id === card.listId;
        return (
          <button
            key={list.id}
            onClick={() => {
              if (!isCurrent) moveCard(cardId, list.id, list.cardIds.length);
              onClose();
            }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              isCurrent
                ? 'text-trello-accent font-medium bg-trello-cardHover/50'
                : 'text-trello-text hover:bg-trello-cardHover'
            }`}
          >
            {list.title}
            {isCurrent && (
              <span className="ml-1.5 text-xs text-trello-textSubtle font-normal">(current)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
