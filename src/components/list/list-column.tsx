'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';
import { ListHeader } from './list-header';
import { ListFooter } from './list-footer';
import { CardItem } from '@/components/card/card-item';

export const ListColumn = memo(
  function ListColumn({ boardId, listId }: { boardId: ID; listId: ID }) {
    const cardIds = useBoardStore(
      useShallow((s) => s.lists[listId]?.cardIds?.filter((id) => !s.cards[id]?.isArchived)),
    );
    // Compute which card IDs don't match the current filter (returned IDs should be hidden)
    const hiddenCardIds = useBoardStore(
      useShallow((s) => {
        const f = s.filterState;
        if (!f.search && f.labelIds.length === 0 && !f.dueFilter) return [] as ID[];
        const ids = (s.lists[listId]?.cardIds ?? []).filter((id) => !s.cards[id]?.isArchived);
        const now = Date.now();
        return ids.filter((id) => {
          const card = s.cards[id];
          if (!card) return false;
          if (f.search && !card.title.toLowerCase().includes(f.search.toLowerCase())) return true;
          if (f.labelIds.length > 0 && !f.labelIds.some((lid) => card.labelIds.includes(lid))) return true;
          if (f.dueFilter === 'none') return card.dueDate !== null;
          if (f.dueFilter === 'overdue') return !(card.dueDate && !card.completed && new Date(card.dueDate).getTime() < now);
          if (f.dueFilter === 'next24h') {
            if (!card.dueDate) return true;
            const t = new Date(card.dueDate).getTime();
            return !(t >= now && t <= now + 86400000);
          }
          if (f.dueFilter === 'nextweek') {
            if (!card.dueDate) return true;
            const t = new Date(card.dueDate).getTime();
            return !(t >= now && t <= now + 7 * 86400000);
          }
          if (f.dueFilter === 'complete') return !card.completed;
          return false;
        });
      }),
    );
    const title = useBoardStore((s) => s.lists[listId]?.title ?? '');
    const collapsed = useBoardStore((s) => s.lists[listId]?.collapsed ?? false);
    const toggleListCollapse = useBoardStore((s) => s.toggleListCollapse);
    const [addingCard, setAddingCard] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
      useSortable({ id: listId, data: { type: 'list' } });

    useLayoutEffect(() => {
      if (!rootRef.current) return;
      rootRef.current.style.transform = CSS.Transform.toString(transform) ?? '';
      rootRef.current.style.transition = transition ?? '';
    }, [transform, transition]);

    if (!cardIds) return null;

    const hiddenSet = new Set(hiddenCardIds);
    // Long lists: let the browser skip rendering off-screen cards (cards remain in
    // the DOM, so DnD is unaffected). Short lists keep the plain layout.
    const virtualize = cardIds.length > 30;

    // Collapsed lists render as a slim vertical bar but still participate in DnD
    // reordering — the whole bar is the drag handle, and a click expands it.
    if (collapsed) {
      return (
        <div
          ref={(node) => {
            setNodeRef(node);
            rootRef.current = node;
          }}
          {...attributes}
          {...listeners}
          onClick={() => toggleListCollapse(listId)}
          role="button"
          tabIndex={0}
          aria-label={`Expand list ${title}`}
          title={`Expand list "${title}"`}
          className={`anim-list-enter w-10 shrink-0 max-h-[calc(100vh-140px)] bg-trello-listBg rounded-xl flex flex-col items-center pt-2 pb-3 cursor-pointer hover:bg-trello-listBg/80 snap-start [contain:layout_style] transition-all duration-200 ${isDragging ? 'opacity-20' : ''}`}
        >
          <span className="text-xs text-trello-textSubtle mb-2">{cardIds.length}</span>
          <span className="[writing-mode:vertical-lr] rotate-180 text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis max-h-[200px]">
            {title}
          </span>
        </div>
      );
    }

    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          rootRef.current = node;
        }}
        className={`anim-list-enter w-[calc(100vw-32px)] md:w-[272px] shrink-0 max-h-[calc(100vh-140px)] flex flex-col bg-trello-listBg rounded-xl snap-start [contain:layout_style] transition-all duration-200 ${isDragging ? 'opacity-20' : ''}`}
      >
        {/* Drag handle — header only so cards/footer remain interactive */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <ListHeader listId={listId} onAddCard={() => setAddingCard(true)} />
        </div>

        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div
            className="flex-1 overflow-y-auto cards-scroll px-1.5 space-y-1.5 pb-1 min-h-2"
            role="list"
            aria-label="Cards"
          >
            {cardIds.length === 0 && (
              <p className="text-xs text-trello-textSubtle italic px-3 py-2">Drop cards here</p>
            )}
            {cardIds.map((cardId) => (
              <div
                key={cardId}
                role="listitem"
                className={`${virtualize ? 'cv-auto ' : ''}${hiddenSet.has(cardId) ? 'opacity-30 pointer-events-none transition-opacity' : 'transition-opacity'}`}
              >
                <CardItem boardId={boardId} listId={listId} cardId={cardId} />
              </div>
            ))}
          </div>
        </SortableContext>

        <ListFooter
          listId={listId}
          open={addingCard}
          onOpen={() => setAddingCard(true)}
          onClose={() => setAddingCard(false)}
        />
      </div>
    );
  },
  (prev, next) => prev.listId === next.listId && prev.boardId === next.boardId,
);
