'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, isSameMonth, isSameDay, format,
} from 'date-fns';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import type { Card, ID } from '@/types';

/**
 * Workspace-level Calendar: due-dated cards across every (non-closed) board in the
 * active workspace, color-dotted by board. Drag a card to reschedule; click to
 * open. Reuses the same Zustand store as the board calendar; no DB.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type WsCard = Card & { _boardBg: string; _boardId: ID };

function toDateKey(d: Date) { return format(d, 'yyyy-MM-dd'); }

function CardChip({ card, onOpen }: { card: WsCard; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`relative h-6 bg-trello-cardBg hover:bg-trello-cardHover rounded text-left text-xs text-trello-text w-full flex items-center overflow-hidden shrink-0 transition-colors ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l shrink-0" style={{ background: card._boardBg }} />
      <span className="truncate pr-1 pl-2.5">{card.title}</span>
    </button>
  );
}

function DayCell({ date, inMonth, isToday, dayCards, onOpen }: {
  date: Date; inMonth: boolean; isToday: boolean; dayCards: WsCard[]; onOpen: (id: ID) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: toDateKey(date) });
  return (
    <div
      ref={setNodeRef}
      className={`relative bg-trello-surface p-1.5 overflow-hidden flex flex-col transition-colors ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'bg-trello-primary/10' : ''} ${isOver ? 'ring-2 ring-inset ring-trello-primary bg-trello-primary/10' : ''}`}
    >
      <div className="flex justify-end items-center mb-1 shrink-0">
        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-trello-primary text-white' : 'text-trello-textSubtle'}`}>
          {date.getDate()}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden min-h-0">
        {dayCards.slice(0, 3).map((card) => <CardChip key={card.id} card={card} onOpen={() => onOpen(card.id)} />)}
        {dayCards.length > 3 && (
          <button onClick={() => onOpen(dayCards[3].id)} className="text-[10px] text-trello-textSubtle hover:text-trello-text text-left pl-1 transition-colors shrink-0">
            +{dayCards.length - 3} more
          </button>
        )}
      </div>
    </div>
  );
}

export function WorkspaceCalendar() {
  const updateCard = useBoardStore((s) => s.updateCard);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [boardFilter, setBoardFilter] = useState<ID | 'all'>('all');
  const [modalCardId, setModalCardId] = useState<ID | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const boards = useBoardStore(
    useShallow((s) => {
      const ws = s.activeWorkspaceId;
      return Object.values(s.boards)
        .filter((b) => !b.isArchived && (!ws || b.workspaceId === ws))
        .map((b) => ({ id: b.id, title: b.title, background: b.background }));
    }),
  );

  const cards = useBoardStore(
    useShallow((s) => {
      const ws = s.activeWorkspaceId;
      const out: WsCard[] = [];
      for (const b of Object.values(s.boards)) {
        if (b.isArchived || (ws && b.workspaceId !== ws)) continue;
        for (const listId of b.listIds) {
          const list = s.lists[listId];
          if (!list || list.isArchived) continue;
          for (const cardId of list.cardIds) {
            const card = s.cards[cardId];
            if (card && !card.isArchived && card.dueDate) out.push({ ...card, _boardBg: b.background, _boardId: b.id });
          }
        }
      }
      return out;
    }),
  );

  const visibleCards = useMemo(
    () => (boardFilter === 'all' ? cards : cards.filter((c) => c._boardId === boardFilter)),
    [cards, boardFilter],
  );

  const cardsByDate = useMemo(() => {
    const map: Record<string, WsCard[]> = {};
    for (const card of visibleCards) {
      if (!card.dueDate) continue;
      (map[card.dueDate.slice(0, 10)] ??= []).push(card);
    }
    return map;
  }, [visibleCards]);

  const cells = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const now = new Date();
  const activeCard = activeId ? visibleCards.find((c) => c.id === activeId) ?? null : null;

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = e.active.id as ID;
    const dateKey = e.over?.id as string | undefined;
    if (!dateKey) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || !card.dueDate || card.dueDate.slice(0, 10) === dateKey) return;
    const [y, m, d] = dateKey.split('-').map(Number);
    const next = new Date(card.dueDate);
    next.setFullYear(y, m - 1, d);
    updateCard(cardId, { dueDate: next.toISOString() });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as ID)} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden px-5 pt-5">
        {/* Header */}
        <div className="shrink-0 mb-3">
          <h1 className="text-xl font-semibold text-trello-text mb-3">Calendar</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-base">{format(viewDate, 'MMMM yyyy')}</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setViewDate((d) => addMonths(d, -1))} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setViewDate(new Date())} className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors">Today</button>
              <button onClick={() => setViewDate((d) => addMonths(d, 1))} className="p-1 rounded hover:bg-white/10 text-white transition-colors" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5 ml-2">
              <FilterPill active={boardFilter === 'all'} onClick={() => setBoardFilter('all')}>All boards</FilterPill>
              {boards.map((b) => (
                <FilterPill key={b.id} active={boardFilter === b.id} onClick={() => setBoardFilter(b.id)}>
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: b.background }} />
                  {b.title}
                </FilterPill>
              ))}
            </div>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-px bg-trello-borderSubtle shrink-0">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-trello-surface py-1.5 text-center text-[11px] font-semibold text-trello-textSubtle uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 gap-px bg-trello-borderSubtle overflow-hidden mb-5" style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}>
          {cells.map((date) => {
            const key = toDateKey(date);
            return (
              <DayCell
                key={key}
                date={date}
                inMonth={isSameMonth(date, viewDate)}
                isToday={isSameDay(date, now)}
                dayCards={cardsByDate[key] ?? []}
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

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? 'bg-trello-accent/15 text-trello-accent' : 'bg-white/5 text-trello-textSecondary hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
