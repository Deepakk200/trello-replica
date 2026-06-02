'use client';

import { useMemo } from 'react';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { ID, LabelColor } from '@/types';
import { LABEL_VAR } from '@/lib/colors';

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-trello-surface rounded-xl p-5 border border-trello-borderSubtle flex flex-col gap-3 shadow">
      <h3 className="text-sm font-semibold text-trello-text">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-trello-cardHover rounded-full h-2.5 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color ?? 'var(--primary)' }}
      />
    </div>
  );
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function DashboardView({ boardId }: { boardId: ID }) {
  const board = useBoardStore((s) => s.boards[boardId]);
  const listsById = useBoardStore((s) => s.lists);
  const cardsById = useBoardStore((s) => s.cards);
  const labels = useBoardStore((s) => s.labels);
  const members = useBoardStore((s) => s.members);

  const { lists, cards } = useMemo(() => {
    if (!board) return { lists: [], cards: [] };
    const lists = [];
    const cards = [];
    for (const listId of board.listIds) {
      const list = listsById[listId];
      if (!list || list.isArchived) continue;
      lists.push(list);
      for (const cardId of list.cardIds) {
        const card = cardsById[cardId];
        if (card && !card.isArchived) cards.push(card);
      }
    }
    return { lists, cards };
  }, [board, cardsById, listsById]);

  // W1: cards per list
  const perList = useMemo(() => {
    const cardIdSet = new Set(cards.map((c) => c.id));
    return lists
      .map((list) => ({
        title: list.title,
        count: list.cardIds.filter((id) => cardIdSet.has(id)).length,
      }))
      .filter((r) => r.count > 0);
  }, [lists, cards]);

  // W2: cards by label
  const perLabel = useMemo(() => {
    const map: Record<string, { name: string; color: LabelColor; count: number }> = {};
    for (const card of cards) {
      for (const lid of card.labelIds) {
        const label = labels[lid]; if (!label) continue;
        if (!map[lid]) map[lid] = { name: label.name, color: label.color, count: 0 };
        map[lid].count++;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [cards, labels]);

  // W3: due this week
  const dueThisWeek = useMemo(() => {
    const now = Date.now();
    const week = 7 * 86400000;
    return cards
      .filter((c) => c.dueDate && !c.completed &&
        new Date(c.dueDate).getTime() >= now &&
        new Date(c.dueDate).getTime() <= now + week)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  }, [cards]);

  // W4: by member
  const perMember = useMemo(() => {
    const map: Record<string, number> = {};
    for (const card of cards) {
      for (const mid of card.memberIds ?? []) map[mid] = (map[mid] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([id, count]) => ({ id, count }));
  }, [cards]);

  const maxList   = Math.max(...perList.map((r) => r.count), 1);
  const maxLabel  = Math.max(...perLabel.map((r) => r.count), 1);
  const maxMember = Math.max(...perMember.map((r) => r.count), 1);

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">

        {/* W1 — Cards per list */}
        <Widget title="Cards per list">
          {perList.length === 0
            ? <p className="text-sm text-trello-textSubtle">No cards yet.</p>
            : perList.map((row) => (
              <div key={row.title} className="flex items-center gap-3">
                <span className="text-xs text-trello-textSecondary w-24 truncate shrink-0">{row.title}</span>
                <Bar pct={(row.count / maxList) * 100} />
                <span className="text-xs font-semibold text-trello-text w-5 text-right shrink-0">{row.count}</span>
              </div>
            ))
          }
        </Widget>

        {/* W2 — Cards by label */}
        <Widget title="Cards by label">
          {perLabel.length === 0
            ? <p className="text-sm text-trello-textSubtle">No labels used yet.</p>
            : perLabel.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 shrink-0">
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: LABEL_VAR[row.color] }}
                  />
                  <span className="text-xs text-trello-textSecondary truncate">{row.name || row.color}</span>
                </div>
                <Bar pct={(row.count / maxLabel) * 100} color={LABEL_VAR[row.color]} />
                <span className="text-xs font-semibold text-trello-text w-5 text-right shrink-0">{row.count}</span>
              </div>
            ))
          }
        </Widget>

        {/* W3 — Due this week */}
        <Widget title="Due this week">
          {dueThisWeek.length === 0
            ? <p className="text-sm text-trello-textSubtle">Nothing due in the next 7 days.</p>
            : (
              <>
                {dueThisWeek.slice(0, 8).map((card) => (
                  <div key={card.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-trello-text truncate flex-1">{card.title}</span>
                    <span className="text-xs text-trello-warning whitespace-nowrap shrink-0">
                      {fmtDate(card.dueDate!)}
                    </span>
                  </div>
                ))}
                {dueThisWeek.length > 8 && (
                  <p className="text-xs text-trello-textSubtle">+{dueThisWeek.length - 8} more</p>
                )}
              </>
            )
          }
        </Widget>

        {/* W4 — By member */}
        <Widget title="By member">
          {perMember.length === 0
            ? <p className="text-sm text-trello-textSubtle">No cards assigned yet.</p>
            : perMember.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <MemberAvatar memberId={row.id} size="xs" />
                <span className="text-xs text-trello-textSecondary w-20 truncate shrink-0">
                  {members[row.id]?.name ?? '?'}
                </span>
                <Bar pct={(row.count / maxMember) * 100} />
                <span className="text-xs font-semibold text-trello-text w-5 text-right shrink-0">{row.count}</span>
              </div>
            ))
          }
        </Widget>

      </div>
    </div>
  );
}
