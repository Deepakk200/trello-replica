'use client';

import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { useBoardStore } from '@/store/use-board-store';
import { formatDate } from '@/lib/time';

const PLANNER_DATE_OPTS: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

export function PlannerPanel() {
  const boards = useBoardStore((s) => s.boards);
  const lists = useBoardStore((s) => s.lists);
  const cards = useBoardStore((s) => s.cards);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return Object.values(cards)
      .filter((card) => card.dueDate && !card.isArchived)
      .filter((card) => {
        const due = new Date(card.dueDate as string).getTime();
        return !Number.isNaN(due) && due >= now && due <= week;
      })
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  }, [cards]);

  const boardTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const board of Object.values(boards)) map[board.id] = board.title;
    return map;
  }, [boards]);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Planner</h2>
              <p className="text-sm text-white/60">Cards due in the next 7 days.</p>
            </div>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-white/60">
            No upcoming due dates.
          </div>
        ) : (
          <div className="grid gap-3">
            {upcoming.map((card) => {
              const list = lists[card.listId];
              const boardTitle = list ? boardTitleById[list.boardId] ?? 'Board' : 'Board';

              return (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{card.title}</p>
                      <p className="mt-1 text-xs text-white/50">{boardTitle} {list ? `· ${list.title}` : ''}</p>
                    </div>
                    <p className="text-xs font-medium text-sky-300">{formatDate(card.dueDate as string, PLANNER_DATE_OPTS)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}