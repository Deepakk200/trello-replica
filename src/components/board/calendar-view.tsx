'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import type { ID } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarView({ boardId }: { boardId: ID }) {
  const now = new Date();
  const [current, setCurrent] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [modalCardId, setModalCardId] = useState<ID | null>(null);

  const cards = useBoardStore(
    useShallow((s) => {
      const board = s.boards[boardId];
      if (!board) return [];
      const result = [];
      for (const listId of board.listIds) {
        const list = s.lists[listId];
        if (!list || list.isArchived) continue;
        for (const cardId of list.cardIds) {
          const card = s.cards[cardId];
          if (card && !card.isArchived && card.dueDate) result.push(card);
        }
      }
      return result;
    }),
  );

  // Group cards by YYYY-MM-DD
  const cardsByDate = useMemo(() => {
    const map: Record<string, typeof cards> = {};
    for (const card of cards) {
      if (!card.dueDate) continue;
      const key = card.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(card);
    }
    return map;
  }, [cards]);

  // 42-cell grid starting on Sunday of the week containing the 1st
  const cells = useMemo(() => {
    const { year, month } = current;
    const firstDay = new Date(year, month, 1);
    const offset = firstDay.getDay();
    const start = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [current]);

  const todayKey = toDateKey(now);

  function prevMonth() {
    setCurrent(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }
  function nextMonth() {
    setCurrent(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }
  function goToday() {
    const d = new Date();
    setCurrent({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 h-12 px-1 mb-1 shrink-0">
        <h2 className="text-white font-semibold text-base min-w-[170px]">
          {MONTH_NAMES[current.month]} {current.year}
        </h2>
        <button
          onClick={goToday}
          className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
        >
          Today
        </button>
        <button onClick={prevMonth} className="p-1 rounded hover:bg-white/10 text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-white/10 text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-white/60 text-xs cursor-pointer select-none">
            <div className="w-8 h-4 rounded-full bg-white/20 relative shrink-0">
              <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white/40" />
            </div>
            Show no-date cards
          </label>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px bg-trello-borderSubtle shrink-0">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="bg-trello-surface py-1.5 text-center text-[11px] font-semibold text-trello-textSubtle uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-trello-borderSubtle overflow-hidden">
        {cells.map((date, i) => {
          const inMonth = date.getMonth() === current.month;
          const dateKey = toDateKey(date);
          const dayCards = cardsByDate[dateKey] ?? [];
          const isToday = dateKey === todayKey;

          return (
            <div
              key={i}
              className={`bg-trello-surface p-1.5 overflow-hidden flex flex-col ${!inMonth ? 'opacity-40' : ''}`}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1 shrink-0">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-trello-primary text-white' : 'text-trello-textSubtle'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Card chips */}
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden min-h-0">
                {dayCards.slice(0, 3).map((card) => {
                  const coverColor = card.cover.type === 'color' ? card.cover.color : undefined;
                  return (
                    <button
                      key={card.id}
                      onClick={() => setModalCardId(card.id)}
                      className="relative h-6 bg-trello-cardBg hover:bg-trello-cardHover rounded text-left text-xs text-trello-text w-full flex items-center overflow-hidden shrink-0 transition-colors"
                    >
                      {coverColor && (
                        <span
                          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l shrink-0"
                          style={{ backgroundColor: coverColor }}
                        />
                      )}
                      <span className={`truncate pr-1 ${coverColor ? 'pl-2.5' : 'pl-1.5'}`}>
                        {card.title}
                      </span>
                    </button>
                  );
                })}
                {dayCards.length > 3 && (
                  <button
                    onClick={() => setModalCardId(dayCards[3].id)}
                    className="text-[10px] text-trello-textSubtle hover:text-trello-text text-left pl-1 transition-colors shrink-0"
                  >
                    +{dayCards.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
    </div>
  );
}
