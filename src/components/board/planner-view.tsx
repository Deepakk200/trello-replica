'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, Calendar, Link, Lock } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCenter,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useBoardStore } from '@/store/use-board-store';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

type PlannerCard = { id: string; title: string; dueDate: string | null };

function DraggableCard({ id, title, onOpen, scheduled }: {
  id: string; title: string; onOpen: () => void; scheduled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={`text-left rounded px-2 py-1 text-xs text-white border w-full truncate transition-colors ${
        scheduled ? 'bg-[#0052CC] border-[#0052CC]/60' : 'bg-[#22272B] border-white/10 hover:border-white/20'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {title}
    </button>
  );
}

function HourRow({ hour, children }: { hour: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${hour}` });
  return (
    <div className="flex items-start border-b border-white/5 min-h-[52px]">
      <div className="w-12 flex-shrink-0 text-right pr-3 pt-0.5">
        <span className="text-xs text-white/30">{formatHour(hour)}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 border-l border-white/10 px-1 py-0.5 flex flex-col gap-1 transition-colors ${isOver ? 'bg-[#0052CC]/20 ring-1 ring-inset ring-[#0052CC]' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

export function PlannerView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);

  const updateCard = useBoardStore((s) => s.updateCard);
  const setActiveCardModal = useBoardStore((s) => s.setActiveCardModal);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // All non-archived cards on the active board. Select STABLE store records and
  // derive in useMemo — selectors that build new objects break shallow caching
  // and cause an infinite render loop.
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const boards = useBoardStore((s) => s.boards);
  const listsById = useBoardStore((s) => s.lists);
  const cardsById = useBoardStore((s) => s.cards);
  const cards = useMemo(() => {
    const id = activeBoardId ?? Object.keys(boards)[0] ?? null;
    const board = id ? boards[id] : null;
    if (!board) return [] as PlannerCard[];
    const out: PlannerCard[] = [];
    for (const lid of board.listIds) {
      const list = listsById[lid];
      if (!list || list.isArchived) continue;
      for (const cid of list.cardIds) {
        const c = cardsById[cid];
        if (c && !c.isArchived) out.push({ id: c.id, title: c.title, dueDate: c.dueDate });
      }
    }
    return out;
  }, [activeBoardId, boards, listsById, cardsById]);

  const unscheduled = useMemo(() => cards.filter((c) => !c.dueDate), [cards]);

  const scheduledByHour = useMemo(() => {
    const map: Record<number, PlannerCard[]> = {};
    for (const c of cards) {
      if (!c.dueDate) continue;
      const d = new Date(c.dueDate);
      if (d.toDateString() !== currentDate.toDateString()) continue;
      (map[d.getHours()] ??= []).push(c);
    }
    return map;
  }, [cards, currentDate]);

  const scheduledCount = useMemo(
    () => Object.values(scheduledByHour).reduce((n, arr) => n + arr.length, 0),
    [scheduledByHour],
  );

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayNum = currentDate.getDate();
  const isToday = currentDate.toDateString() === new Date().toDateString();
  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  function shiftDay(delta: number) {
    setCurrentDate((d) => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });
  }

  function handleDragStart(e: DragStartEvent) { setActiveId(e.active.id as string); }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = e.active.id as string;
    const over = e.over?.id as string | undefined;
    if (!over || !over.startsWith('slot-')) return;
    const hour = parseInt(over.replace('slot-', ''), 10);
    const due = new Date(currentDate);
    due.setHours(hour, 0, 0, 0);
    updateCard(cardId, { dueDate: due.toISOString() });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-col h-full w-full" style={{ background: '#1C2B41' }}>
        {/* Calendar nav header */}
        <div className="flex items-center gap-1 h-11 px-3 border-b border-white/10 flex-shrink-0">
          <button className="flex items-center gap-1 text-sm text-white font-medium hover:bg-white/10 px-2 py-1 rounded">
            <Calendar size={14} className="text-white/60" />{monthYear}<ChevronRight size={12} className="text-white/60" />
          </button>
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={() => shiftDay(-1)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Previous day"><ChevronLeft size={14} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-0.5 text-sm text-white hover:bg-white/10 rounded">Today</button>
            <button onClick={() => shiftDay(1)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Next day"><ChevronRight size={14} /></button>
          </div>
          <div className="flex-1" />
          <button className="p-1 rounded hover:bg-white/10 text-white/50" aria-label="Planner options"><MoreHorizontal size={14} /></button>
        </div>

        {/* Day header row */}
        <div className="flex items-baseline gap-3 px-12 py-2 border-b border-white/10 flex-shrink-0">
          <span className="text-2xl font-light text-white">{weekday}</span>
          <span className={`text-2xl font-semibold ${isToday ? 'bg-[#0052CC] text-white w-9 h-9 rounded-full flex items-center justify-center' : 'text-white/80'}`}>{dayNum}</span>
        </div>

        {/* Unscheduled strip */}
        {unscheduled.length > 0 && (
          <div className="flex-shrink-0 border-b border-white/10 px-3 py-2 max-h-28 overflow-y-auto">
            <p className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">Unscheduled · drag to a time</p>
            <div className="flex flex-wrap gap-1.5">
              {unscheduled.map((c) => (
                <div key={c.id} className="max-w-[160px]">
                  <DraggableCard id={c.id} title={c.title} onOpen={() => setActiveCardModal(c.id)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All-day row */}
        <div className="flex items-stretch border-b border-white/10 flex-shrink-0 min-h-[34px]">
          <div className="w-12 flex-shrink-0 text-right pr-3 pt-1.5">
            <span className="text-[10px] text-white/30">all-day</span>
          </div>
          <div className="flex-1 border-l border-white/10" />
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="sticky top-0 left-0 z-10 text-xs text-white/30 px-3 py-1" style={{ background: '#1C2B41' }}>GMT+5:30</div>
          {HOURS.map((hour) => (
            <HourRow key={hour} hour={hour}>
              {(scheduledByHour[hour] ?? []).map((c) => (
                <DraggableCard key={c.id} id={c.id} title={c.title} scheduled onOpen={() => setActiveCardModal(c.id)} />
              ))}
            </HourRow>
          ))}

          {/* Current-time indicator (only when viewing today) */}
          {isToday && (() => {
            const lt = new Date();
            const top = 22 + lt.getHours() * 52 + (lt.getMinutes() / 60) * 52;
            return (
              <div className="absolute left-12 right-0 z-20 pointer-events-none" style={{ top }}>
                <div className="absolute -left-1.5 -top-[5px] w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="h-[2px] bg-red-500" />
              </div>
            );
          })()}
        </div>

        {/* Connect-calendar empty state — only when nothing is scheduled this day */}
        {scheduledCount === 0 && (
          <div className="absolute inset-x-0 flex flex-col items-center justify-center gap-6 px-8 pointer-events-none" style={{ top: unscheduled.length > 0 ? '244px' : '144px', bottom: '60px' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0078D4] flex items-center justify-center text-white text-lg font-bold shadow-lg">O</div>
              <div className="flex flex-col gap-1"><div className="w-6 h-0.5 bg-white/30 rounded" /><div className="w-6 h-0.5 bg-white/30 rounded self-end" /></div>
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="white" /><rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4" fillOpacity="0.1" stroke="#4285F4" strokeWidth="1" /><text x="12" y="16" textAnchor="middle" fill="#EA4335" fontSize="10" fontWeight="bold">12</text></svg>
              </div>
              <div className="flex flex-col gap-1"><div className="w-6 h-0.5 bg-white/30 rounded" /><div className="w-6 h-0.5 bg-white/30 rounded self-end" /></div>
              <div className="w-12 h-12 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="8" height="17" rx="1.5" fill="white" /><rect x="13" y="3" width="8" height="11" rx="1.5" fill="white" /></svg>
              </div>
            </div>
            <div className="text-center pointer-events-auto">
              <h3 className="text-base font-semibold text-white mb-2">Connect your calendar account</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-6 max-w-[280px]">See all of your events. Drag, drop, get it done. Schedule your to-dos on your calendar and make time for what truly matters.</p>
              <button className="flex items-center gap-2 mx-auto border border-white/30 text-white text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-colors"><Link size={14} />Connect an account</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 flex-shrink-0">
          <Lock size={12} className="text-white/40 flex-shrink-0" />
          <span className="text-xs text-white/40">Only you can see your Planner.</span>
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="rounded px-2 py-1 text-xs bg-white text-slate-900 shadow-lg max-w-[180px] truncate">{activeCard.title}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
