'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, differenceInCalendarDays, eachDayOfInterval, format, isSameDay,
  isWeekend, max as maxDate, min as minDate, parseISO, startOfDay,
} from 'date-fns';
import { useShallow } from 'zustand/shallow';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { CardModal } from '@/components/card/card-modal';
import { LABEL_VAR } from '@/lib/colors';
import type { Card, ID, LabelColor } from '@/types';

/**
 * Timeline (Gantt) view. Each card with a start and/or due date renders as a bar
 * in its list's swimlane on a horizontal day axis. Interactions (all pointer-based
 * so they never touch the board's @dnd-kit context):
 *  - drag a bar  → shift start+due by N days (reschedule)
 *  - drag the left edge  → set/adjust the start date
 *  - drag the right edge → adjust the due date
 *  - drag an unscheduled card onto the grid → give it a due date
 *  - click a bar → open the card modal
 * Cards with neither date sit in the "Unscheduled" tray.
 */

const ZOOMS = [
  { id: 'week', label: 'Weeks', dayW: 18 },
  { id: 'day', label: 'Days', dayW: 40 },
] as const;
type Zoom = (typeof ZOOMS)[number]['id'];

const LANE_W = 168; // fixed left label column
const ROW_H = 40;

type ScheduledCard = Card & { _start: Date; _end: Date; _hasStart: boolean };

type DragState =
  | { cardId: ID; mode: 'move' | 'resize-l' | 'resize-r'; startX: number; deltaDays: number }
  | { cardId: ID; mode: 'schedule'; startX: number; deltaDays: number; clientX: number };

function dueTimeSuffix(iso: string | null | undefined): string {
  // Preserve the time-of-day on the due date when shifting whole days.
  if (!iso || iso.length < 16) return 'T00:00:00.000Z';
  return `T${iso.slice(11, 16)}:00.000Z`;
}
function toISO(day: Date, timeSuffix = 'T00:00:00.000Z') {
  return `${format(day, 'yyyy-MM-dd')}${timeSuffix}`;
}

export function TimelineView({ boardId }: { boardId: ID }) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const labels = useBoardStore((s) => s.labels);

  // Lists (swimlanes) + their cards, scheduled vs unscheduled.
  const lists = useBoardStore(
    useShallow((s) => {
      const board = s.boards[boardId];
      if (!board) return [] as { id: ID; title: string; cards: Card[] }[];
      return board.listIds
        .map((lid) => s.lists[lid])
        .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived)
        .map((l) => ({
          id: l.id,
          title: l.title,
          cards: l.cardIds.map((cid) => s.cards[cid]).filter((c): c is Card => !!c && !c.isArchived),
        }));
    }),
  );

  const [zoom, setZoom] = useState<Zoom>('day');
  const dayW = ZOOMS.find((z) => z.id === zoom)!.dayW;
  const [modalCardId, setModalCardId] = useState<ID | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Mirror of `drag` so pointerup can commit without doing side effects inside a
  // (pure) state updater.
  const dragRef = useRef<DragState | null>(null);
  // Distinguishes a real drag from a click (the synthetic click fires after
  // pointerup, when `drag` is already null) so a drag never opens the modal.
  const movedRef = useRef(false);

  // Split into scheduled (has start or due) and unscheduled.
  const { scheduledByList, unscheduled } = useMemo(() => {
    const byList: Record<ID, ScheduledCard[]> = {};
    const tray: Card[] = [];
    for (const l of lists) {
      byList[l.id] = [];
      for (const c of l.cards) {
        if (c.dueDate || c.startDate) {
          const start = startOfDay(parseISO((c.startDate ?? c.dueDate)!));
          const end = startOfDay(parseISO((c.dueDate ?? c.startDate)!));
          byList[l.id].push({
            ...c,
            _start: start <= end ? start : end,
            _end: end >= start ? end : start,
            _hasStart: !!c.startDate,
          });
        } else {
          tray.push(c);
        }
      }
    }
    return { scheduledByList: byList, unscheduled: tray };
  }, [lists]);

  // Visible day range: span of all scheduled cards, padded; fallback = this month.
  const days = useMemo(() => {
    const all: Date[] = [];
    for (const arr of Object.values(scheduledByList)) {
      for (const c of arr) { all.push(c._start); all.push(c._end); }
    }
    let from: Date, to: Date;
    if (all.length) {
      from = addDays(minDate(all), -3);
      to = addDays(maxDate(all), 7);
    } else {
      const t = startOfDay(new Date());
      from = addDays(t, -7);
      to = addDays(t, 21);
    }
    // Always include today so the marker shows.
    const today = startOfDay(new Date());
    from = minDate([from, addDays(today, -2)]);
    to = maxDate([to, addDays(today, 2)]);
    return eachDayOfInterval({ start: from, end: to });
  }, [scheduledByList]);

  const dayIndex = (d: Date) => differenceInCalendarDays(startOfDay(d), days[0]);

  function findScheduled(cardId: ID): ScheduledCard | undefined {
    for (const arr of Object.values(scheduledByList)) {
      const f = arr.find((c) => c.id === cardId);
      if (f) return f;
    }
    return undefined;
  }

  function commitDrag(d: DragState) {
    if (d.mode === 'schedule') {
      if (!movedRef.current) return; // a click, not a drag → handled by onClick (opens modal)
      // Day under the pointer in the scrollable content.
      const rect = contentRef.current?.getBoundingClientRect();
      if (!rect) return;
      const idx = Math.max(0, Math.min(days.length - 1, Math.floor((d.clientX - rect.left) / dayW)));
      updateCard(d.cardId, { dueDate: toISO(days[idx], 'T12:00:00.000Z') });
      return;
    }
    if (d.deltaDays === 0) return; // no-op (a click, handled separately)
    const c = findScheduled(d.cardId);
    if (!c) return;
    if (d.mode === 'move') {
      const dueDate = toISO(addDays(c._end, d.deltaDays), dueTimeSuffix(c.dueDate));
      updateCard(c.id, c._hasStart
        ? { dueDate, startDate: toISO(addDays(c._start, d.deltaDays)) }
        : { dueDate });
    } else if (d.mode === 'resize-l') {
      const newStart = addDays(c._start, d.deltaDays);
      if (newStart > c._end) return;
      updateCard(c.id, { startDate: toISO(newStart) });
    } else if (d.mode === 'resize-r') {
      const newEnd = addDays(c._end, d.deltaDays);
      if (newEnd < c._start) return;
      updateCard(c.id, { dueDate: toISO(newEnd, dueTimeSuffix(c.dueDate)) });
    }
  }

  // ── Pointer drag plumbing ─────────────────────────────────────────────────
  useEffect(() => {
    if (!drag) return;
    const startX = drag.startX;
    function onMove(e: PointerEvent) {
      const delta = Math.round((e.clientX - startX) / dayW);
      if (Math.abs(e.clientX - startX) > 3) movedRef.current = true;
      const next: DragState =
        drag!.mode === 'schedule'
          ? { ...drag!, deltaDays: delta, clientX: e.clientX }
          : { ...drag!, deltaDays: delta };
      dragRef.current = next;
      setDrag(next);
    }
    function onUp() {
      if (dragRef.current) commitDrag(dragRef.current);
      dragRef.current = null;
      setDrag(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.cardId, drag?.mode, dayW]);

  const today = startOfDay(new Date());
  const totalW = days.length * dayW;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 h-11 px-1 shrink-0">
        <span className="text-white font-semibold text-base px-2">Timeline</span>
        <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-md p-0.5">
          <button
            onClick={() => setZoom('week')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${zoom === 'week' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <ZoomOut size={13} /> Weeks
          </button>
          <button
            onClick={() => setZoom('day')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${zoom === 'day' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'}`}
          >
            <ZoomIn size={13} /> Days
          </button>
        </div>
      </div>

      {/* Grid: fixed lane column + scrollable timeline */}
      <div className="flex-1 min-h-0 flex border border-trello-borderSubtle rounded-lg overflow-hidden bg-trello-surface">
        {/* Lane labels */}
        <div className="shrink-0 bg-trello-listBg/40 border-r border-trello-borderSubtle" style={{ width: LANE_W }}>
          <div className="h-10 border-b border-trello-borderSubtle flex items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle">
            Lists
          </div>
          {lists.map((l) => (
            <div key={l.id} className="flex items-center px-3 border-b border-trello-borderSubtle/60 text-sm text-trello-text truncate" style={{ height: ROW_H }}>
              {l.title}
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div className="flex-1 overflow-x-auto overflow-y-auto cards-scroll">
          <div ref={contentRef} className="relative" style={{ width: totalW }}>
            {/* Day header */}
            <div className="h-10 flex sticky top-0 z-10 bg-trello-surface border-b border-trello-borderSubtle">
              {days.map((d, i) => (
                <div
                  key={i}
                  className={`shrink-0 flex flex-col items-center justify-center border-r border-trello-borderSubtle/40 ${isWeekend(d) ? 'bg-white/[0.03]' : ''} ${isSameDay(d, today) ? 'bg-trello-primary/15' : ''}`}
                  style={{ width: dayW }}
                >
                  {(zoom === 'day' || d.getDate() === 1 || d.getDay() === 1) && (
                    <span className="text-[10px] text-trello-textSubtle leading-none">{format(d, zoom === 'day' ? 'EEE' : 'MMM')}</span>
                  )}
                  <span className={`text-[11px] leading-tight ${isSameDay(d, today) ? 'text-trello-primary font-bold' : 'text-trello-textSecondary'}`}>
                    {d.getDate()}
                  </span>
                </div>
              ))}
            </div>

            {/* Today vertical marker */}
            <div className="absolute top-10 bottom-0 w-px bg-trello-primary/60 z-0 pointer-events-none" style={{ left: dayIndex(today) * dayW + dayW / 2 }} />

            {/* Rows */}
            {lists.map((l) => (
              <div key={l.id} className="relative border-b border-trello-borderSubtle/60" style={{ height: ROW_H }}>
                {/* weekend striping */}
                {days.map((d, i) => (
                  isWeekend(d) ? <div key={i} className="absolute top-0 bottom-0 bg-white/[0.02]" style={{ left: i * dayW, width: dayW }} /> : null
                ))}
                {scheduledByList[l.id]?.map((c) => {
                  const left = dayIndex(c._start) * dayW;
                  const span = Math.max(1, differenceInCalendarDays(c._end, c._start) + 1);
                  const width = span * dayW;
                  const isDragging = drag?.cardId === c.id;
                  const previewLeft = isDragging && drag.mode === 'move' ? left + drag.deltaDays * dayW
                    : isDragging && drag.mode === 'resize-l' ? left + drag.deltaDays * dayW : left;
                  const previewW = isDragging && drag.mode === 'resize-l' ? width - drag.deltaDays * dayW
                    : isDragging && drag.mode === 'resize-r' ? width + drag.deltaDays * dayW : width;
                  const labelColor = c.labelIds[0] ? labels[c.labelIds[0]]?.color : undefined;
                  const barColor = c.cover.type === 'color' && c.cover.color
                    ? c.cover.color
                    : labelColor ? LABEL_VAR[labelColor as LabelColor] : 'var(--accent)';
                  return (
                    <div
                      key={c.id}
                      className={`absolute top-1.5 h-7 rounded-md flex items-center text-white text-xs shadow-sm group ${isDragging ? 'opacity-80 ring-2 ring-white/60 z-20' : 'z-10'}`}
                      style={{ left: Math.max(0, previewLeft), width: Math.max(dayW, previewW), background: barColor }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        movedRef.current = false;
                        setDrag({ cardId: c.id, mode: 'move', startX: e.clientX, deltaDays: 0 });
                      }}
                      onClick={() => { if (movedRef.current) { movedRef.current = false; return; } setModalCardId(c.id); }}
                      title={`${c.title} · ${format(c._start, 'MMM d')}–${format(c._end, 'MMM d')}`}
                    >
                      {/* left resize handle */}
                      <span
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); movedRef.current = false; setDrag({ cardId: c.id, mode: 'resize-l', startX: e.clientX, deltaDays: 0 }); }}
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-l-md bg-black/10 opacity-0 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                      <span className="truncate px-2 pointer-events-none">{c.title}</span>
                      {/* right resize handle */}
                      <span
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); movedRef.current = false; setDrag({ cardId: c.id, mode: 'resize-r', startX: e.clientX, deltaDays: 0 }); }}
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize rounded-r-md bg-black/10 opacity-0 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unscheduled tray */}
      {unscheduled.length > 0 && (
        <div className="shrink-0 mt-2 border border-trello-borderSubtle rounded-lg bg-trello-surface p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-1.5 px-1">
            Unscheduled ({unscheduled.length}) — drag onto the timeline to set a due date
          </p>
          <div className="flex gap-1.5 overflow-x-auto cards-scroll pb-1">
            {unscheduled.map((c) => {
              const isDragging = drag?.cardId === c.id && drag.mode === 'schedule';
              return (
                <button
                  key={c.id}
                  onPointerDown={(e) => { e.preventDefault(); movedRef.current = false; setDrag({ cardId: c.id, mode: 'schedule', startX: e.clientX, deltaDays: 0, clientX: e.clientX }); }}
                  onClick={() => { if (movedRef.current) { movedRef.current = false; return; } setModalCardId(c.id); }}
                  className={`shrink-0 h-7 px-2.5 rounded-md bg-trello-cardBg hover:bg-trello-cardHover text-xs text-trello-text border border-trello-borderSubtle max-w-44 truncate transition-colors ${isDragging ? 'opacity-50' : ''}`}
                  title={c.title}
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
    </div>
  );
}
