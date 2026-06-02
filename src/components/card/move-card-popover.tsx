'use client';

import { useEffect, useRef, useState } from 'react';
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

  const [destListId, setDestListId] = useState<ID>(card?.listId ?? '');
  const [position, setPosition]     = useState(1);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  if (!card) return null;

  const destList = lists.find((l) => l.id === destListId) ?? null;
  const isSameList = destListId === card.listId;
  const destCount = destList ? destList.cardIds.length : 0;
  // Within the same list the card already occupies a slot, so max position is the
  // current count; moving to another list adds one extra slot at the end.
  const maxPos = Math.max(1, isSameList ? destCount : destCount + 1);
  const safePos = Math.min(position, maxPos);

  function selectList(id: ID) {
    setDestListId(id);
    setPosition(1);
  }

  function doMove() {
    if (!destListId) return;
    moveCard(cardId, destListId, safePos - 1);
    onClose();
  }

  const fieldCls =
    'w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors';

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-64 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-50 p-3 flex flex-col gap-2"
    >
      <p className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide">
        Move card
      </p>

      <label className="text-xs text-trello-textSubtle">List</label>
      <select className={fieldCls} value={destListId} onChange={(e) => selectList(e.target.value)}>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.title}{list.id === card.listId ? ' (current)' : ''}
          </option>
        ))}
      </select>

      <label className="text-xs text-trello-textSubtle">Position</label>
      <select
        className={fieldCls}
        value={safePos}
        onChange={(e) => setPosition(Number(e.target.value))}
      >
        {Array.from({ length: maxPos }, (_, i) => i + 1).map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <button onClick={doMove} className="btn-primary text-xs px-3 py-1.5 mt-1">Move</button>
    </div>
  );
}
