'use client';

import { useShallow } from 'zustand/shallow';
import { ThumbsUp } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { CustomFieldValue, ID } from '@/types';

/**
 * Compact card-front badges for the Power-Ups: a vote count (Voting) and up to
 * three non-empty custom-field chips (Custom Fields). Renders nothing when the
 * board's power-ups are off or there's nothing to show.
 */
export function CardPowerUpBadges({ boardId, cardId }: { boardId: ID; cardId: ID }) {
  const data = useBoardStore(
    useShallow((s) => {
      const board = s.boards[boardId];
      const card = s.cards[cardId];
      if (!board || !card) return null;
      const voting = !!board.powerUps?.voting;
      const fieldsOn = !!board.powerUps?.customFields;
      const voteCount = voting ? (card.votes?.length ?? 0) : 0;

      const chips: { name: string; value: string }[] = [];
      if (fieldsOn) {
        const values = card.customFieldValues ?? {};
        for (const f of board.customFields ?? []) {
          const v = values[f.id];
          if (v === undefined || v === null || v === '') continue;
          chips.push({ name: f.name, value: fmtValue(v) });
        }
      }
      if (voteCount === 0 && chips.length === 0) return null;
      return { voteCount, chips: chips.slice(0, 3) };
    }),
  );

  if (!data) return null;

  return (
    <div className="relative z-[2] px-3 pb-2 flex flex-wrap items-center gap-1">
      {data.voteCount > 0 && (
        <span className="inline-flex items-center gap-1 text-[11px] text-trello-textSecondary bg-trello-cardHover rounded px-1.5 py-0.5">
          <ThumbsUp className="w-3 h-3" /> {data.voteCount}
        </span>
      )}
      {data.chips.map((c) => (
        <span key={c.name} title={`${c.name}: ${c.value}`} className="inline-flex items-center text-[11px] text-trello-textSecondary bg-trello-cardHover rounded px-1.5 py-0.5 max-w-32 truncate">
          {c.value}
        </span>
      ))}
    </div>
  );
}

function fmtValue(v: CustomFieldValue): string {
  if (typeof v === 'boolean') return v ? '✓' : '';
  return String(v);
}
