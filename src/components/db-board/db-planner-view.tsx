'use client';

// DB Planner — Trello's WEEK time-grid (Mon–Sun columns × hour rows) over every
// DUE-dated card in the active workspace's open boards (NOT the localStorage
// store). Drag a card to another day/hour cell to reschedule it → updateCard.
// Click a card to open it on its board. Per-board filter pills hide/show boards.
// When the visible week has nothing scheduled, Trello's "Planner / Connect your
// calendars" empty state shows over the grid.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Maximize2, Lock, RefreshCw } from 'lucide-react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { getWorkspaceDueCards, updateCard } from '@/features/cards/actions';
import { notify } from '@/store/use-toast-store';
import * as Sentry from '@sentry/nextjs';

type DueCard = Awaited<ReturnType<typeof getWorkspaceDueCards>>[number];

const DAY_MS = 86_400_000;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_H = 48;     // px per hour row
const GUTTER = 56;    // px time-gutter width (keep header + rows in sync)

function formatHour(h: number): string {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}
// Monday-first week start (Trello shows Mon … Sun).
function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const tzLabel = (() => {
  const off = -new Date().getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  return `GMT${sign}${h}:${String(m).padStart(2, '0')}`;
})();

function PlannerCard({ card, onOpen }: { card: DueCard; onOpen: () => void }) {
  const drag = useDraggable({ id: card.id });
  return (
    <button
      ref={(el) => drag.setNodeRef(el)}
      {...drag.attributes}
      {...drag.listeners}
      onClick={onOpen}
      className={`text-left rounded px-1.5 py-1 text-[11px] leading-tight text-white border w-full transition-colors bg-[#22272B] border-white/10 hover:border-white/30 ${drag.isDragging ? 'opacity-40' : ''} ${card.completed ? 'opacity-60 line-through' : ''}`}
      title={`${card.title} — ${card.boardTitle}`}
    >
      <span className="block truncate">{card.title}</span>
    </button>
  );
}

function Cell({ dayIdx, hour, children }: { dayIdx: number; hour: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${dayIdx}-${hour}` });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 border-l border-white/10 px-0.5 py-0.5 flex flex-col gap-0.5 transition-colors ${isOver ? 'bg-[#0052CC]/20 ring-1 ring-inset ring-[#0052CC]' : ''}`}
    >
      {children}
    </div>
  );
}

export function DbPlannerView() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<DueCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hiddenBoards, setHiddenBoards] = useState<Set<string>>(new Set());
  const [today] = useState(() => new Date());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getWorkspaceDueCards();
        if (mounted) setCards(data);
      } catch { /* signed out / no workspace */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // Open scrolled to ~8am like Trello (the morning hours are most relevant).
  useEffect(() => {
    if (!loading && scrollRef.current) scrollRef.current.scrollTop = 8 * ROW_H;
  }, [loading]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)),
    [weekStart],
  );

  const boardsInView = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; bg: string }>();
    for (const c of cards) if (!seen.has(c.boardId)) seen.set(c.boardId, { id: c.boardId, title: c.boardTitle, bg: c.boardBg });
    return [...seen.values()];
  }, [cards]);

  const visible = useMemo(() => cards.filter((c) => !hiddenBoards.has(c.boardId)), [cards, hiddenBoards]);

  // Cards bucketed by `${dayIdx}-${hour}` within the visible week.
  const byCell = useMemo(() => {
    const map: Record<string, DueCard[]> = {};
    for (const c of visible) {
      if (!c.dueDate) continue;
      const d = new Date(c.dueDate);
      const idx = days.findIndex((day) => sameDay(day, d));
      if (idx === -1) continue;
      (map[`${idx}-${d.getHours()}`] ??= []).push(c);
    }
    return map;
  }, [visible, days]);

  const weekCount = useMemo(() => Object.values(byCell).reduce((n, a) => n + a.length, 0), [byCell]);

  const monthLabel = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  function shiftWeek(delta: number) {
    setWeekStart((s) => new Date(s.getTime() + delta * 7 * DAY_MS));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const cardId = e.active.id as string;
    const over = e.over?.id as string | undefined;
    if (!over || !over.startsWith('cell-')) return;
    const [, dayIdxStr, hourStr] = over.split('-');
    const dayIdx = parseInt(dayIdxStr, 10);
    const hour = parseInt(hourStr, 10);
    const card = cards.find((c) => c.id === cardId);
    if (!card || !days[dayIdx]) return;
    const target = new Date(days[dayIdx]);
    target.setHours(hour, 0, 0, 0);
    const iso = target.toISOString();

    const snapshot = cards;
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, dueDate: target } : c)));
    (async () => {
      try {
        await updateCard(cardId, { dueDate: iso });
      } catch (err) {
        setCards(snapshot);
        notify.error("Couldn't reschedule the card");
        Sentry.captureException(err);
      }
    })();
  }

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
      <div className="relative flex flex-col h-full w-full" style={{ background: '#1C2B41' }}>
        {/* Calendar header */}
        <div className="flex items-center gap-0.5 h-11 px-3 border-b border-white/10 flex-shrink-0">
          <button className="flex items-center gap-1 text-sm text-white font-medium hover:bg-white/10 px-2 py-1 rounded">
            {monthLabel}<ChevronDown size={13} className="text-white/60" />
          </button>
          <button onClick={() => shiftWeek(-1)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Previous week"><ChevronLeft size={15} /></button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-2 py-0.5 text-sm text-white hover:bg-white/10 rounded">Today</button>
          <button onClick={() => shiftWeek(1)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white" aria-label="Next week"><ChevronRight size={15} /></button>
          <div className="flex-1" />
          <button className="flex items-center gap-1 text-sm text-white/70 hover:text-white hover:bg-white/10 px-2 py-1 rounded" aria-label="Fit to screen">
            <Maximize2 size={13} />Fit
          </button>
          <button className="p-1 rounded hover:bg-white/10 text-white/50" aria-label="Planner options"><MoreHorizontal size={15} /></button>
        </div>

        {/* Board filter pills */}
        {boardsInView.length > 1 && (
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-white/10 flex-shrink-0">
            {boardsInView.map((b) => {
              const on = !hiddenBoards.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => setHiddenBoards((h) => { const n = new Set(h); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n; })}
                  aria-pressed={on}
                  className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border transition-colors ${on ? 'border-white/30 text-white' : 'border-white/10 text-white/40'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.bg }} />
                  <span className="max-w-[120px] truncate">{b.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Day-column header (sticky above the scrolling grid) */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <div className="flex-shrink-0 flex items-end justify-center pb-1.5" style={{ width: GUTTER }}>
            <span className="text-[10px] text-white/30 truncate px-1">{tzLabel}</span>
          </div>
          {days.map((d) => {
            const isToday = sameDay(d, today);
            return (
              <div key={d.getTime()} className="flex-1 min-w-0 text-center py-1.5 border-l border-white/10">
                <div className="text-[10px] uppercase tracking-wide text-white/40">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-sm font-semibold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#8C7AE6] text-white' : 'text-white/80'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-white/50">Loading…</p>
          ) : (
            <>
              {HOURS.map((hour) => (
                <div key={hour} className="flex border-b border-white/5" style={{ minHeight: ROW_H }}>
                  <div className="flex-shrink-0 text-right pr-2 pt-0.5" style={{ width: GUTTER }}>
                    {hour > 0 && <span className="text-[11px] text-white/30">{formatHour(hour)}</span>}
                  </div>
                  {days.map((d, dayIdx) => (
                    <Cell key={d.getTime()} dayIdx={dayIdx} hour={hour}>
                      {(byCell[`${dayIdx}-${hour}`] ?? []).map((c) => (
                        <PlannerCard key={c.id} card={c} onOpen={() => router.push(`/board/${c.boardId}?card=${c.id}`)} />
                      ))}
                    </Cell>
                  ))}
                </div>
              ))}

              {/* Empty state — only when the visible week has nothing scheduled */}
              {weekCount === 0 && (
                <div className="absolute inset-x-0 flex flex-col items-center justify-center gap-5 px-4 pointer-events-none" style={{ top: '24px', bottom: '24px' }}>
                  <div className="flex items-center justify-center flex-wrap gap-2">
                    {/* Outlook */}
                    <div className="w-11 h-11 rounded-xl bg-[#0078D4] flex items-center justify-center text-white text-base font-bold shadow-lg">O</div>
                    {/* Google Calendar */}
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg">
                      <svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#4285F4" strokeWidth="1.5" /><text x="12" y="17" textAnchor="middle" fill="#EA4335" fontSize="10" fontWeight="bold">31</text></svg>
                    </div>
                    {/* arrows → Trello */}
                    <div className="flex flex-col gap-1 px-1">
                      <ChevronRight size={14} className="text-white/40" />
                      <ChevronRight size={14} className="text-white/40" />
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg">
                      <svg width="24" height="24" viewBox="0 0 28 28" fill="none"><rect x="4" y="4" width="8" height="20" rx="1.5" fill="white" /><rect x="16" y="4" width="8" height="12" rx="1.5" fill="white" /></svg>
                    </div>
                  </div>
                  <div className="text-center pointer-events-auto">
                    <h3 className="text-lg font-bold text-white mb-2">Planner</h3>
                    <p className="text-sm text-white/60 leading-relaxed mb-5 max-w-[300px]">Connect your calendars to get a side-by-side view of your Planner and your to-do&apos;s.</p>
                    <button className="flex items-center justify-center gap-2 mx-auto whitespace-nowrap shrink-0 bg-[#579DFF] hover:bg-[#85B8FF] text-[#1D2125] text-sm font-medium px-4 py-1.5 rounded transition-colors">
                      <RefreshCw size={14} className="shrink-0" />Connect an account
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

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
