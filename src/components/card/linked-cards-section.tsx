'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Plus, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function LinkedCardsSection({ cardId }: { cardId: ID }) {
  const { card, cards, boards, lists } = useBoardStore(
    useShallow((s) => ({
      card: s.cards[cardId],
      cards: s.cards,
      boards: s.boards,
      lists: s.lists,
    })),
  );
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const setActiveCardModal = useBoardStore((s) => s.setActiveCardModal);
  const linkCards = useBoardStore((s) => s.linkCards);
  const unlinkCards = useBoardStore((s) => s.unlinkCards);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const linkedCards = useMemo(() => {
    if (!card) return [];
    return (card.linkedCardIds ?? [])
      .map((linkedCardId) => cards[linkedCardId])
      .filter(Boolean)
      .map((linkedCard) => {
        const list = lists[linkedCard.listId];
        const board = list ? boards[list.boardId] : null;
        return { card: linkedCard, boardName: board?.title ?? 'Board' };
      });
  }, [boards, card, cards, lists]);

  const linkableCards = useMemo(() => {
    if (!card) return [];
    const normalized = query.trim().toLowerCase();
    return Object.values(cards)
      .filter((candidate) => candidate.id !== cardId && !(card.linkedCardIds ?? []).includes(candidate.id))
      .filter((candidate) => {
        if (!normalized) return true;
        const list = lists[candidate.listId];
        const board = list ? boards[list.boardId] : null;
        return candidate.title.toLowerCase().includes(normalized)
          || String(candidate.number).includes(normalized.replace(/^#/, ''))
          || board?.title.toLowerCase().includes(normalized);
      })
      .slice(0, 8)
      .map((candidate) => {
        const list = lists[candidate.listId];
        const board = list ? boards[list.boardId] : null;
        return { card: candidate, boardName: board?.title ?? 'Board' };
      });
  }, [boards, card, cardId, cards, lists, query]);

  if (!card) return null;

  function openCard(targetId: ID) {
    const target = cards[targetId];
    if (!target) return;
    const list = lists[target.listId];
    if (list) setActiveBoard(list.boardId);
    setActiveCardModal(target.id);
  }

  return (
    <div ref={rootRef} className="pl-8">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-4 w-4 text-trello-textSubtle" />
        <span className="font-semibold text-sm text-trello-text flex-1">Linked cards <span className="text-trello-textSubtle">({linkedCards.length})</span></span>
      </div>

      <div className="flex flex-wrap gap-2">
        {linkedCards.map(({ card: linkedCard, boardName }) => (
          <button
            key={linkedCard.id}
            onClick={() => openCard(linkedCard.id)}
            className="bg-trello-cardBg rounded px-2 py-1 flex items-center gap-2 text-sm hover:bg-trello-cardHover transition-colors"
          >
            <span>#{linkedCard.number}</span>
            <span className="max-w-48 truncate">{linkedCard.title}</span>
            <span className="text-[11px] text-trello-textSubtle truncate max-w-24">{boardName}</span>
            <span
              onClick={(e) => { e.stopPropagation(); unlinkCards(cardId, linkedCard.id); }}
              className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded hover:bg-trello-cardHover text-trello-textSubtle"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}

        <div className="relative">
          <button
            onClick={() => setOpen((current) => !current)}
            className="bg-trello-cardBg rounded px-2 py-1 flex items-center gap-1.5 text-sm hover:bg-trello-cardHover transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Link a card
          </button>

          {open && (
            <div className="absolute left-0 top-full mt-2 w-90 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl overflow-hidden z-50">
              <div className="p-2 border-b border-trello-borderSubtle">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cards"
                  className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {linkableCards.map(({ card: candidate, boardName }) => (
                  <button
                    key={candidate.id}
                    onClick={() => { linkCards(cardId, candidate.id); setOpen(false); setQuery(''); }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-trello-cardHover transition-colors flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0 truncate text-sm text-trello-text">#{candidate.number} {candidate.title}</span>
                    <span className="text-xs text-trello-textSubtle truncate max-w-32">{boardName}</span>
                  </button>
                ))}
                {linkableCards.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-trello-textSubtle">No cards found</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}