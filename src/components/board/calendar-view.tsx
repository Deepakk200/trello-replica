'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import type { Card, ID } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CardChip({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const coverColor = card.cover.type === 'color' ? card.cover.color : undefined;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`relative h-6 bg-trello-cardBg hover:bg-trello-cardHover rounded text-left text-xs text-trello-text w-full flex items-center overflow-hidden shrink-0 transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      {coverColor && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l shrink-0" style={{ backgroundColor: coverColor }} />
      )}
      <span className={`truncate pr-1 ${coverColor ? 'pl-2.5' : 'pl-1.5'}`}>{card.title}</span>
    </button>
  );
}

function DayCell({
  date, inMonth, isToday, dayCards, onOpen,
}: {
  date: Date; inMonth: boolean; isToday: boolean;
  dayCards: Card[]; onOpen: (id: ID) => void;
}) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={`bg-trello-surface p-1.5 overflow-hidden flex flex-col transition-colors ${!inMonth ? 'opacity-40' : ''} ${isOver ? 'ring-2 ring-inset ring-trello-primary bg-trello-primary/10' : ''}`}
    >
      <div className="flex justify-end mb-1 shrink-0">
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-trello-primary text-white' : 'text-trello-textSubtle'}`}>
          {date.getDate()}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden min-h-0">
        {dayCards.slice(0, 3).map((card) => (
          <CardChip key={card.id} card={card} onOpen={() => onOpen(card.id)} />
        ))}
        {dayCards.length > 3 && (
          <button
            onClick={() => onOpen(dayCards[3].id)}
            className="text-[10px] text-trello-textSubtle hover:text-trello-text text-left pl-1 transition-colors shrink-0"
          >
            +{dayCards.length - 3} more
          </button>
        )}
      </div>
    </div>
  );
}

export function CalendarView({ boardId }: { boardId: ID }) {
  const now = new Date();
  const [current, setCurrent] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [modalCardId, setModalCardId] = useState<ID | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);

  const updateCard = useBoardStore((s) => s.updateCard);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const cards = useBoardStore(
    useShallow((s) => {
      const board = s.boards[boardId];
      if (!board) return [] as Card[];
      const result: Card[] = [];
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

  const cardsByDate = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const card of cards) {
      if (!card.dueDate) continue;
      const key = card.dueDate.slice(0, 10);
      (map[key] ??= []).push(card);
    }
    return map;
  }, [cards]);

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
  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function prevMonth() {
    setCurrent(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }));
  }
  function nextMonth() {
    setCurrent(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }));
  }
  function goToday() {
    const d = new Date();
    setCurrent({ year: d.getFullYear(), month: d.getMonth() });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as ID);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = e.active.id as ID;
    const dateKey = e.over?.id as string | undefined;
    if (!dateKey) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || !card.dueDate) return;
    if (card.dueDate.slice(0, 10) === dateKey) return; // same day — no change

    const [y, m, d] = dateKey.split('-').map(Number);
    const next = new Date(card.dueDate);
    next.setFullYear(y, m - 1, d);
    updateCard(cardId, { dueDate: next.toISOString() });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 h-12 px-1 mb-1 shrink-0">
          <h2 className="text-white font-semibold text-base min-w-[170px]">
            {MONTH_NAMES[current.month]} {current.year}
          </h2>
          <button onClick={goToday} className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors">
            Today
          </button>
          <button onClick={prevMonth} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-auto text-white/40 text-xs hidden sm:inline">Drag a card to reschedule</span>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-px bg-trello-borderSubtle shrink-0">
          {DAY_NAMES.map((d) => (
            <div key={d} className="bg-trello-surface py-1.5 text-center text-[11px] font-semibold text-trello-textSubtle uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-trello-borderSubtle overflow-hidden">
          {cells.map((date) => {
            const dateKey = toDateKey(date);
            return (
              <DayCell
                key={dateKey}
                date={date}
                inMonth={date.getMonth() === current.month}
                isToday={dateKey === todayKey}
                dayCards={cardsByDate[dateKey] ?? []}
                onOpen={setModalCardId}
              />
            );
          })}
        </div>

        {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="h-6 px-2 bg-white text-slate-900 rounded text-xs flex items-center shadow-lg max-w-[200px]">
            <span className="truncate">{activeCard.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
