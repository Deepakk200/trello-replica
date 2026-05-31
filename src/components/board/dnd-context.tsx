'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { boardStore, useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

type ActiveType = 'card' | 'list' | null;

export function BoardDndContext({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<ID | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);

  // Reactive reads for the DragOverlay only
  const overlayCard = useBoardStore((s) =>
    activeId && activeType === 'card' ? s.cards[activeId] : null,
  );
  const overlayList = useBoardStore((s) =>
    activeId && activeType === 'list' ? s.lists[activeId] : null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as ID);
    setActiveType((active.data.current?.type ?? null) as ActiveType);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeData = active.data.current;
    if (activeData?.type !== 'card') return;

    // Read freshest state — avoid stale closure
    const card = boardStore.getState().cards[active.id as ID];
    if (!card) return;

    const overData = over.data.current;
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
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setActiveType(null);
    if (!over || active.id === over.id) return;

    const state = boardStore.getState();
    const activeData = active.data.current;
    const overData = over.data.current;

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

    // ── Card reorder / cross-list final position ──────────────────────────────
    if (activeData?.type === 'card') {
      // Card's listId was already updated by onDragOver
      const card = state.cards[active.id as ID];
      if (!card) return;

      if (overData?.type === 'card') {
        // Only reorder when both cards are now in the same list
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
      // If over a list container (empty list): card already placed by onDragOver
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
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
              const list = s.lists[s.cards[active.id as ID]?.listId ?? '']?.title;
              return over
                ? `Card ${title} dropped into ${list ?? over.id}.`
                : `Card ${title} dropped.`;
            }
            return `List ${s.lists[active.id as ID]?.title ?? active.id} reordered.`;
          },
          onDragCancel({ active }) {
            const s = boardStore.getState();
            return active.data.current?.type === 'card'
              ? `Drag cancelled. Card ${s.cards[active.id as ID]?.title ?? active.id} returned to original position.`
              : `Drag cancelled. List ${s.lists[active.id as ID]?.title ?? active.id} returned to original position.`;
          },
        },
      }}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {overlayCard && (
          <div className="w-[272px]">
            <div className="bg-[#22272b] rounded-lg px-3 py-2 text-sm text-slate-100 shadow-2xl ring-2 ring-sky-400 rotate-2 opacity-95 w-full cursor-grabbing">
              {overlayCard.title}
            </div>
          </div>
        )}
        {overlayList && (
          <div className="w-[272px] shrink-0 rounded-xl bg-[#101204] opacity-60 min-h-[5rem] border-2 border-sky-400/40 cursor-grabbing" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
