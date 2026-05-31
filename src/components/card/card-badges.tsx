'use client';

import { AlignLeft, CheckSquare, Clock, MessageSquare, Paperclip } from 'lucide-react';
import type { Card } from '@/types';

type DueStatus = 'overdue' | 'soon' | 'completed' | 'normal';

function getDueStatus(dueDate: string, completed: boolean): DueStatus {
  if (completed) return 'completed';
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff <= 24 * 60 * 60 * 1000) return 'soon';
  return 'normal';
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

const DUE_STYLES: Record<DueStatus, string> = {
  overdue:   'bg-red-700/80 text-white rounded px-1.5 py-0.5',
  soon:      'bg-amber-700 text-white rounded px-1.5 py-0.5',
  completed: 'bg-emerald-700/80 text-white rounded px-1.5 py-0.5 line-through',
  normal:    'text-trello-textSecondary',
};

export function CardBadges({ card }: { card: Card }) {
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
    <div className="flex flex-row flex-wrap gap-2 mt-1 text-xs text-trello-textSecondary items-center">
      {card.dueDate && dueStatus && (
        <span className={`flex items-center gap-1 ${DUE_STYLES[dueStatus]}`}>
          <Clock className="w-3 h-3 shrink-0" />
          {formatDate(card.dueDate)}
        </span>
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
