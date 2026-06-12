'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, CalendarPlus } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, isSameMonth, isSameDay, format, parseISO,
} from 'date-fns';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import { CalendarAddCardPopover } from './calendar-add-card-popover';
import type { Card, ID } from '@/types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // Monday-first

function toDateKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
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
  date, inMonth, isToday, dayCards, onOpen, onAdd,
}: {
  date: Date; inMonth: boolean; isToday: boolean;
  dayCards: Card[]; onOpen: (id: ID) => void; onAdd: (date: Date) => void;
}) {
  const dateKey = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  return (
    <div
      ref={setNodeRef}
      className={`group relative bg-trello-surface p-1.5 overflow-hidden flex flex-col transition-colors ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'bg-trello-primary/10' : ''} ${isOver ? 'ring-2 ring-inset ring-trello-primary bg-trello-primary/10' : ''}`}
    >
      <div className="flex justify-between items-center mb-1 shrink-0">
        <button
          onClick={() => onAdd(date)}
          className="opacity-0 group-hover:opacity-100 text-trello-textSubtle hover:text-white transition-opacity"
          aria-label="Add card on this day"
        >
          <Plus size={13} />
        </button>
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
  const calendarViewDate = useBoardStore((s) => s.calendarViewDate);
  const setCalendarViewDate = useBoardStore((s) => s.setCalendarViewDate);
  const updateCard = useBoardStore((s) => s.updateCard);

  const viewDate = useMemo(() => {
    try { return parseISO(calendarViewDate); } catch { return new Date(); }
  }, [calendarViewDate]);

  const [modalCardId, setModalCardId] = useState<ID | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [addDate, setAddDate] = useState<Date | null>(null);

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

  // Monday-first 6-week grid covering the visible month.
  const cells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const now = new Date();
  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function shiftMonth(delta: number) {
    setCalendarViewDate(addMonths(viewDate, delta).toISOString());
  }
  function goToday() {
    setCalendarViewDate(new Date().toISOString());
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
        <div className="flex items-center gap-2 h-12 px-1 mb-1 shrink-0">
          <button className="flex items-center gap-1 text-white font-semibold text-base hover:bg-white/10 px-2 py-1 rounded transition-colors">
            {format(viewDate, 'MMM yyyy')}
            <ChevronDown size={14} className="text-white/60" />
          </button>
          <div className="flex items-center gap-0.5">
            <button onClick={() => shiftMonth(-1)} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors">
              Today
            </button>
            <button onClick={() => shiftMonth(1)} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button className="flex items-center gap-1 text-sm text-white/80 hover:bg-white/10 px-2 py-1 rounded transition-colors">
            Month
            <ChevronDown size={12} className="text-white/60" />
          </button>

          <button className="ml-auto flex items-center gap-1.5 text-sm text-white/80 hover:bg-white/10 px-2.5 py-1 rounded transition-colors">
            <CalendarPlus size={14} />
            <span className="hidden sm:inline">Sync to personal calendar</span>
          </button>
        </div>

        {/* Day-of-week header (Monday-first) */}
        <div className="grid grid-cols-7 gap-px bg-trello-borderSubtle shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-trello-surface py-1.5 text-center text-[11px] font-semibold text-trello-textSubtle uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 gap-px bg-trello-borderSubtle overflow-hidden" style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
          {cells.map((date) => {
            const dateKey = toDateKey(date);
            return (
              <DayCell
                key={dateKey}
                date={date}
                inMonth={isSameMonth(date, viewDate)}
                isToday={isSameDay(date, now)}
                dayCards={cardsByDate[dateKey] ?? []}
                onOpen={setModalCardId}
                onAdd={setAddDate}
              />
            );
          })}
        </div>

        {/* Bottom-left "+ Add" — defaults to today */}
        <div className="shrink-0 px-1 pt-1.5">
          <button
            onClick={() => setAddDate(new Date())}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded transition-colors"
          >
            <Plus size={15} />
            Add
          </button>
        </div>

        {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}

        {addDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={() => setAddDate(null)}>
            <div onMouseDown={(e) => e.stopPropagation()}>
              <CalendarAddCardPopover boardId={boardId} defaultDate={addDate} onClose={() => setAddDate(null)} />
            </div>
          </div>
        )}
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
