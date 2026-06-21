'use client';

import { AlignLeft, Check, CheckSquare, Clock, MessageSquare, Paperclip } from 'lucide-react';
import type { Card } from '@/types';
import { formatDate } from '@/lib/time';
import { useBoardStore } from '@/store/use-board-store';

type DueStatus = 'overdue' | 'soon' | 'completed' | 'normal';

function getDueStatus(dueDate: string, completed: boolean): DueStatus {
  if (completed) return 'completed';
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff <= 24 * 60 * 60 * 1000) return 'soon';
  return 'normal';
}

const DUE_STYLES: Record<DueStatus, string> = {
  overdue:   'bg-[#F87168]/80 text-white rounded px-1.5 py-0.5',
  soon:      'bg-[#F5CD47]/80 text-[#172B4D] rounded px-1.5 py-0.5',
  completed: 'bg-[#4BCE97]/80 text-[#172B4D] rounded px-1.5 py-0.5 line-through',
  normal:    'text-trello-textSecondary',
};

export function CardBadges({ card }: { card: Card }) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const commentCount = card.activity.filter((a) => a.type === 'commented').length;
  const checklists   = card.checklists ?? [];
  const clTotal      = checklists.reduce((n, cl) => n + cl.items.length, 0);
  const clDone       = checklists.reduce((n, cl) => n + cl.items.filter((i) => i.completed).length, 0);
  const hasChecklist = clTotal > 0;
  const allDone      = hasChecklist && clDone === clTotal;
  const attCount     = card.attachments?.length ?? 0;
  const hasBadges    = card.dueDate || card.description.length > 0 || commentCount > 0 || hasChecklist || attCount > 0;

  if (!hasBadges) return null;

  const dueStatus = card.dueDate ? getDueStatus(card.dueDate, card.completed) : null;

  return (
    <div className="px-3 pb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-subtle)]">
      {card.dueDate && dueStatus && (
        /* Click toggles completion (Trello "mark complete from the badge"); sits
           above the card's open-target overlay (z-2) with stopPropagation. */
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); updateCard(card.id, { completed: !card.completed }); }}
          title={card.completed ? 'Mark incomplete' : 'Mark complete'}
          aria-label={card.completed ? 'Mark incomplete' : 'Mark complete'}
          className={`relative z-[2] group/due flex items-center gap-1 ${DUE_STYLES[dueStatus]}`}
        >
          {card.completed
            ? <Check className="w-3 h-3 shrink-0" />
            : <Clock className="w-3 h-3 shrink-0 group-hover/due:hidden" />}
          {!card.completed && <Check className="w-3 h-3 shrink-0 hidden group-hover/due:block" />}
          {formatDate(card.dueDate)}
        </button>
      )}

      {card.description.length > 0 && (
        <span className="flex items-center gap-1" title="Has description">
          <AlignLeft className="w-3 h-3 shrink-0" />
        </span>
      )}

      {commentCount > 0 && (
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3 shrink-0" />
          {commentCount}
        </span>
      )}

      {hasChecklist && (
        <span className={`flex items-center gap-1 ${allDone ? 'bg-emerald-700/80 text-white rounded px-1.5 py-0.5' : ''}`}>
          <CheckSquare className="w-3 h-3 shrink-0" />
          {clDone}/{clTotal}
        </span>
      )}

      {attCount > 0 && (
        <span className="flex items-center gap-1">
          <Paperclip className="w-3 h-3 shrink-0" />
          {attCount}
        </span>
      )}
    </div>
  );
}
