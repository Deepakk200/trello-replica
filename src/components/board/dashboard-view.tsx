'use client';

import { useMemo, useState } from 'react';
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

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-trello-surface rounded-xl p-4 border border-trello-borderSubtle flex flex-col gap-1 shadow">
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-trello-textSecondary">{label}</span>
    </div>
  );
}

type DonutSeg = { label: string; value: number; color: string };

// Pure-SVG donut (no chart lib — keeps the bundle dependency-free).
function Donut({ segments }: { segments: DonutSeg[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 54;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
          {total > 0 && segments.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * C;
            const dash = `${len} ${C - len}`;
            const el = (
              <circle
                key={s.label}
                cx="70" cy="70" r={r} fill="none"
                stroke={s.color} strokeWidth="16"
                strokeDasharray={dash} strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="70" y="66" textAnchor="middle" className="fill-white" fontSize="22" fontWeight="700">{total}</text>
        <text x="70" y="84" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">cards</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-trello-textSecondary">{s.label}</span>
            <span className="text-trello-text font-semibold ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardView({ boardId }: { boardId: ID }) {
  const board = useBoardStore((s) => s.boards[boardId]);
  const listsById = useBoardStore((s) => s.lists);
  const cardsById = useBoardStore((s) => s.cards);
  const labels = useBoardStore((s) => s.labels);
  const members = useBoardStore((s) => s.members);
  // Snapshot "now" once (a render-pure value) so the memos below stay pure.
  const [nowMs] = useState(() => Date.now());

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
    const now = nowMs;
    const week = 7 * 86400000;
    return cards
      .filter((c) => c.dueDate && !c.completed &&
        new Date(c.dueDate).getTime() >= now &&
        new Date(c.dueDate).getTime() <= now + week)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  }, [cards, nowMs]);

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

  // Summary stats + due-date status breakdown
  const stats = useMemo(() => {
    const now = nowMs;
    const day = 86400000;
    const firstId = lists[0]?.id;
    const lastId = lists[lists.length - 1]?.id;
    let total = 0, completed = 0, overdue = 0, dueSoon = 0, onTrack = 0, noDate = 0, inProgress = 0;
    for (const c of cards) {
      total++;
      const t = c.dueDate ? new Date(c.dueDate).getTime() : null;
      if (c.completed) completed++;
      else if (t !== null && t < now) overdue++;
      else if (t !== null && t <= now + day) dueSoon++;
      else if (t !== null) onTrack++;
      else noDate++;
      if (c.listId !== firstId && c.listId !== lastId) inProgress++;
    }
    return { total, completed, overdue, dueSoon, onTrack, noDate, inProgress };
  }, [cards, lists, nowMs]);

  const dueSegments: DonutSeg[] = [
    { label: 'Overdue',   value: stats.overdue,   color: '#E2483D' },
    { label: 'Due soon',  value: stats.dueSoon,   color: '#FF9F1A' },
    { label: 'On track',  value: stats.onTrack,   color: '#61BD4F' },
    { label: 'No date',   value: stats.noDate,    color: '#626F7A' },
    { label: 'Completed', value: stats.completed, color: '#00875A' },
  ];

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill label="Total cards" value={stats.total} color="var(--text-primary)" />
        <StatPill label="Completed" value={stats.completed} color="#61BD4F" />
        <StatPill label="Overdue" value={stats.overdue} color="#E2483D" />
        <StatPill label="In progress" value={stats.inProgress} color="#FF9F1A" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Due date status — donut */}
        <Widget title="Due date status">
          <Donut segments={dueSegments} />
        </Widget>

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
    </div>
  );
}
