'use client';

import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useShallow } from 'zustand/shallow';
import { boardStore, useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';
import { LABEL_VAR } from '@/lib/colors';

type ActiveType = 'card' | 'list' | null;

export function BoardDndContext({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId]     = useState<ID | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);
  const originalListIdRef           = useRef<ID | null>(null);

  // Reactive reads for DragOverlay
  const overlayCard = useBoardStore((s) =>
    activeId && activeType === 'card' ? s.cards[activeId] : null,
  );
  const overlayCardLabels = useBoardStore(
    useShallow((s) =>
      activeId && activeType === 'card'
        ? (s.cards[activeId]?.labelIds ?? []).map((id) => s.labels[id]).filter(Boolean)
        : [],
    ),
  );
  const overlayList = useBoardStore((s) =>
    activeId && activeType === 'list' ? s.lists[activeId] : null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = useCallback(function ({ active }: DragStartEvent) {
    const id = active.id as ID;
    setActiveId(id);
    setActiveType((active.data.current?.type ?? null) as ActiveType);
    if (active.data.current?.type === 'card') {
      originalListIdRef.current = boardStore.getState().cards[id]?.listId ?? null;
    }
  }, []);

  const onDragOver = useCallback(function ({ active, over }: DragOverEvent) {
    if (!over) return;
    if (active.data.current?.type !== 'card') return;

    const card = boardStore.getState().cards[active.id as ID];
    if (!card) return;

    const overData   = over.data.current;
    const overListId: ID | null =
      overData?.type === 'card' ? (overData.listId as ID) :
      overData?.type === 'list' ? (over.id as ID) :
      null;

    if (!overListId || card.listId === overListId) return;

    // Optimistic cross-list move — append to destination
    const destList = boardStore.getState().lists[overListId];
    if (destList) {
      boardStore.getState().moveCard(active.id as ID, overListId, destList.cardIds.length);
    }
  }, []);

  const onDragEnd = useCallback(function ({ active, over }: DragEndEvent) {
    setActiveId(null);
    setActiveType(null);
    originalListIdRef.current = null;

    if (!over || active.id === over.id) return;

    const state      = boardStore.getState();
    const activeData = active.data.current;
    const overData   = over.data.current;

    // ── List reorder ──────────────────────────────────────────────────────────
    if (activeData?.type === 'list') {
      const activeBoardId = state.activeBoardId;
      const board = activeBoardId ? state.boards[activeBoardId] : null;
      if (!board || !activeBoardId) return;

      const oldIdx = board.listIds.indexOf(active.id as ID);
      const newIdx = board.listIds.indexOf(over.id as ID);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        state.reorderLists(activeBoardId, arrayMove(board.listIds, oldIdx, newIdx));
      }
      return;
    }

    // ── Card reorder within the same list ──────────────────────────────────────
    if (activeData?.type === 'card' && overData?.type === 'card') {
      const card = state.cards[active.id as ID];
      if (!card) return;
      const overCardListId = overData.listId as ID;
      if (card.listId !== overCardListId) return;

      const list = state.lists[card.listId];
      if (!list) return;

      const oldIdx = list.cardIds.indexOf(active.id as ID);
      const newIdx = list.cardIds.indexOf(over.id as ID);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        state.reorderCardsInList(card.listId, arrayMove(list.cardIds, oldIdx, newIdx));
      }
    }
    // Card over empty list container → already placed by onDragOver
  }, []);

  const onDragCancel = useCallback(function ({ active }: DragCancelEvent) {
    const origListId = originalListIdRef.current;
    setActiveId(null);
    setActiveType(null);
    originalListIdRef.current = null;

    // Revert optimistic cross-list move
    if (active.data.current?.type === 'card' && origListId) {
      const state = boardStore.getState();
      const card  = state.cards[active.id as ID];
      if (card && card.listId !== origListId) {
        const origList = state.lists[origListId];
        if (origList) {
          state.moveCard(active.id as ID, origListId, origList.cardIds.length);
        }
      }
    }
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements: {
          onDragStart({ active }) {
            const s = boardStore.getState();
            return active.data.current?.type === 'card'
              ? `Picked up card: ${s.cards[active.id as ID]?.title ?? active.id}.`
              : `Picked up list: ${s.lists[active.id as ID]?.title ?? active.id}.`;
          },
          onDragOver({ active, over }) {
            if (!over) return;
            const s = boardStore.getState();
            if (active.data.current?.type === 'card') {
              const cardTitle = s.cards[active.id as ID]?.title ?? active.id;
              const destList =
                over.data.current?.type === 'list'
                  ? s.lists[over.id as ID]?.title
                  : s.lists[s.cards[over.id as ID]?.listId ?? '']?.title;
              return `Card ${cardTitle} is over ${destList ?? over.id}.`;
            }
            return `List ${s.lists[active.id as ID]?.title} is over ${s.lists[over.id as ID]?.title ?? over.id}.`;
          },
          onDragEnd({ active, over }) {
            const s = boardStore.getState();
            if (active.data.current?.type === 'card') {
              const title = s.cards[active.id as ID]?.title ?? active.id;
              const list  = s.lists[s.cards[active.id as ID]?.listId ?? '']?.title;
              return over
                ? `Card ${title} dropped into ${list ?? over.id}.`
                : `Card ${title} dropped.`;
            }
            return `List ${s.lists[active.id as ID]?.title ?? active.id} reordered.`;
          },
          onDragCancel({ active }) {
            const s = boardStore.getState();
            return active.data.current?.type === 'card'
              ? `Drag cancelled. Card ${s.cards[active.id as ID]?.title ?? active.id} returned.`
              : `Drag cancelled. List ${s.lists[active.id as ID]?.title ?? active.id} returned.`;
          },
        },
      }}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {overlayCard && (() => {
          const cover   = overlayCard.cover;
          const hasCover = cover?.type !== 'none';
          const isFull   = hasCover && cover?.size === 'full';
          const coverBg  = cover?.type === 'color' ? cover.color
                         : cover?.type === 'image' ? cover.image
                         : undefined;
          return (
            <div className="w-[272px] rotate-3 scale-105 opacity-95 cursor-grabbing">
              <div className="bg-[var(--card-bg)] rounded-lg shadow-2xl overflow-hidden border border-[var(--accent)]/30">
                {hasCover && (
                  <div
                    className={`w-full ${isFull ? 'h-24' : 'h-8'}`}
                    style={coverBg ? { background: coverBg } : undefined}
                  />
                )}
                {!isFull && (
                  <>
                    {overlayCardLabels.length > 0 && (
                      <div className="px-3 pt-2 pb-0 flex flex-wrap gap-1">
                        {overlayCardLabels.map((label) => (
                          <span
                            key={label.id}
                            className="h-2 w-10 rounded-full"
                            style={{ background: LABEL_VAR[label.color] }}
                          />
                        ))}
                      </div>
                    )}
                    <p className="px-3 py-1.5 text-sm font-medium leading-snug text-[var(--text-primary)] break-words">
                      {overlayCard.title}
                    </p>
                  </>
                )}
              </div>
            </div>
          );
        })()}
        {overlayList && (
          <div className="w-[272px] shrink-0 rounded-xl bg-trello-listBg opacity-70 min-h-[5rem] border-2 border-dashed border-white/30 cursor-grabbing" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
