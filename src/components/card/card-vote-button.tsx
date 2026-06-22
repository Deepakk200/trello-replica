'use client';

import { useShallow } from 'zustand/shallow';
import { ThumbsUp } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

/**
 * Vote control for the Voting power-up. Renders nothing unless the card's board
 * has Voting enabled. Toggles the current user's vote and shows the total count.
 */
export function CardVoteButton({ cardId, className = '' }: { cardId: ID; className?: string }) {
  const toggleCardVote = useBoardStore((s) => s.toggleCardVote);

  const data = useBoardStore(
    useShallow((s) => {
      const card = s.cards[cardId];
      if (!card) return null;
      const board = s.boards[s.lists[card.listId]?.boardId ?? ''];
      if (!board?.powerUps?.voting) return null;
      const voter = s.currentUserId ?? 'me';
      const votes = card.votes ?? [];
      return { count: votes.length, voted: votes.includes(voter) };
    }),
  );

  if (!data) return null;

  return (
    <button
      onClick={() => toggleCardVote(cardId)}
      aria-pressed={data.voted}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium transition-colors ${
        data.voted ? 'bg-trello-accent/20 text-trello-accent' : 'bg-trello-cardHover text-trello-textSecondary hover:text-trello-text'
      } ${className}`}
    >
      <ThumbsUp className="w-4 h-4" /> Vote{data.count > 0 ? ` · ${data.count}` : ''}
    </button>
  );
}
