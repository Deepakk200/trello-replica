'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { EmptyState } from '@/components/ui/empty-state';
import type { Card, ID } from '@/types';

/**
 * Workspace-level Analytics: aggregate trends across every (non-closed) board in
 * the active workspace. Pure-SVG charts (no chart dependency — consistent with the
 * board Dashboard). Reads the Zustand store; no DB.
 *
 * Note on "completed over time": the legacy store has `card.completed` (boolean)
 * but no completion timestamp, so completion trend can't be derived precisely.
 * The time-series therefore charts **cards created per week** (from `createdAt`,
 * which IS reliable), plus point-in-time status/board/member breakdowns.
 */

const WEEKS = 12;
const WEEK_MS = 7 * 86_400_000;

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-trello-surface rounded-xl p-4 border border-trello-borderSubtle flex flex-col gap-1 shadow">
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-trello-textSecondary">{label}</span>
    </div>
  );
}

function Widget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-trello-surface rounded-xl p-5 border border-trello-borderSubtle flex flex-col gap-4 shadow">
      <h3 className="text-sm font-semibold text-trello-text">{title}</h3>
      {children}
    </div>
  );
}

type DonutSeg = { label: string; value: number; color: string };
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
              <circle key={s.label} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-offset} />
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

/** Pure-SVG column chart of cards created per week (last N weeks). */
function WeeklyBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 640, H = 160, padB = 22, padT = 8;
  const bandW = W / data.length;
  const barW = Math.min(34, bandW * 0.62);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img" aria-label="Cards created per week">
      {data.map((d, i) => {
        const h = ((d.value / max) * (H - padB - padT));
        const x = i * bandW + (bandW - barW) / 2;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="3" fill="var(--accent)" opacity={0.85} />
            {d.value > 0 && <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.7)">{d.value}</text>}
            <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function HBars({ rows }: { rows: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-xs text-trello-textSubtle italic">No data yet.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 truncate text-trello-textSecondary shrink-0" title={r.label}>{r.label}</span>
          <div className="flex-1 bg-trello-cardHover rounded-full h-2.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.max((r.value / max) * 100, 3)}%`, backgroundColor: r.color ?? 'var(--primary)' }} />
          </div>
          <span className="w-6 text-right text-trello-text font-semibold shrink-0">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceAnalytics() {
  const members = useBoardStore((s) => s.members);

  const boards = useBoardStore(
    useShallow((s) => {
      const ws = s.activeWorkspaceId;
      return Object.values(s.boards)
        .filter((b) => !b.isArchived && (!ws || b.workspaceId === ws))
        .map((b) => ({ id: b.id, title: b.title, background: b.background }));
    }),
  );

  const rows = useBoardStore(
    useShallow((s) => {
      const ws = s.activeWorkspaceId;
      const out: (Card & { _boardId: ID })[] = [];
      for (const b of Object.values(s.boards)) {
        if (b.isArchived || (ws && b.workspaceId !== ws)) continue;
        for (const listId of b.listIds) {
          const list = s.lists[listId];
          if (!list || list.isArchived) continue;
          for (const cardId of list.cardIds) {
            const card = s.cards[cardId];
            if (card && !card.isArchived) out.push({ ...card, _boardId: b.id });
          }
        }
      }
      return out;
    }),
  );

  const stats = useMemo(() => {
    const now = new Date().getTime();
    let completed = 0, overdue = 0, open = 0;
    for (const c of rows) {
      if (c.completed) completed++;
      else if (c.dueDate && new Date(c.dueDate).getTime() < now) overdue++;
      else open++;
    }
    return { total: rows.length, completed, overdue, open };
  }, [rows]);

  // Cards created per ISO-ish week over the last WEEKS weeks.
  const weekly = useMemo(() => {
    const now = new Date().getTime();
    const startOfThisWeek = now - (now % WEEK_MS);
    const buckets: { label: string; value: number; from: number; to: number }[] = [];
    for (let i = WEEKS - 1; i >= 0; i--) {
      const from = startOfThisWeek - i * WEEK_MS;
      const to = from + WEEK_MS;
      buckets.push({ label: new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' }).format(new Date(from)), value: 0, from, to });
    }
    for (const c of rows) {
      const t = new Date(c.createdAt).getTime();
      const b = buckets.find((x) => t >= x.from && t < x.to);
      if (b) b.value++;
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }, [rows]);

  const perBoard = useMemo(() => {
    const counts: Record<ID, number> = {};
    for (const c of rows) counts[c._boardId] = (counts[c._boardId] ?? 0) + 1;
    return boards
      .map((b) => ({ label: b.title, value: counts[b.id] ?? 0, color: b.background }))
      .sort((a, b) => b.value - a.value);
  }, [rows, boards]);

  const perMember = useMemo(() => {
    const counts: Record<ID, number> = {};
    for (const c of rows) for (const mid of c.memberIds ?? []) counts[mid] = (counts[mid] ?? 0) + 1;
    return Object.entries(counts)
      .map(([mid, value]) => ({ label: members[mid]?.name ?? 'Unknown', value, color: members[mid]?.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [rows, members]);

  if (rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState title="No analytics yet" subtitle="Create cards on your boards and trends across the workspace will show up here." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      <h1 className="text-xl font-semibold text-trello-text mb-4">Analytics</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatPill label="Total cards" value={stats.total} color="var(--text-primary)" />
        <StatPill label="Completed" value={stats.completed} color="#4BCE97" />
        <StatPill label="Overdue" value={stats.overdue} color="#F87168" />
        <StatPill label="Boards" value={boards.length} color="var(--accent)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-2">
          <Widget title={`Cards created — last ${WEEKS} weeks`}>
            <WeeklyBars data={weekly} />
          </Widget>
        </div>
        <Widget title="Status breakdown">
          <Donut segments={[
            { label: 'Completed', value: stats.completed, color: '#4BCE97' },
            { label: 'Overdue', value: stats.overdue, color: '#F87168' },
            { label: 'Open', value: stats.open, color: '#579DFF' },
          ]} />
        </Widget>
        <Widget title="Cards per board">
          <HBars rows={perBoard} />
        </Widget>
        <Widget title="Top members by assigned cards">
          <HBars rows={perMember} />
        </Widget>
      </div>
    </div>
  );
}
