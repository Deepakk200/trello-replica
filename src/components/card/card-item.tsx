'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { GripVertical, Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { ID } from '@/types';
import { LABEL_VAR } from '@/lib/colors';
import { useLabelExpansion } from '@/lib/label-expansion';
import { CardBadges } from './card-badges';
import { QuickEditPopover } from './quick-edit-popover';
import { archiveCardWithUndo } from '@/features/undo/archive-actions';

export const CardItem = memo(
  function CardItem({ boardId, listId, cardId }: { boardId: ID; listId: ID; cardId: ID }) {
    void boardId;

    const card           = useBoardStore((s) => s.cards[cardId]);
    const cardLabels     = useBoardStore(
      useShallow((s) => (s.cards[cardId]?.labelIds ?? []).map((id) => s.labels[id]).filter(Boolean)),
    );
    const cardAgingEnabled   = useBoardStore((s) => s.cardAgingEnabled);
    const selectedCardIds    = useBoardStore((s) => s.selectedCardIds);
    const toggleCardSelection = useBoardStore((s) => s.toggleCardSelection);
    const selectCardRange     = useBoardStore((s) => s.selectCardRange);
    const setActiveCardModal  = useBoardStore((s) => s.setActiveCardModal);
    const updateCard          = useBoardStore((s) => s.updateCard);
    const { expanded: labelsExpanded, toggle: toggleLabels } = useLabelExpansion();

    const [quickEditPos, setQuickEditPos] = useState<{ x: number; y: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } =
      useSortable({ id: cardId, data: { type: 'card', listId } });

    // Split the sortable listeners: pointer/touch activation stays on the whole
    // card (drag-from-anywhere, unchanged), while keyboard activation moves to a
    // dedicated grip handle. This frees Enter/Space on the card body to open the
    // modal, and gives keyboard users a real, discoverable way to start a drag.
    const { onKeyDown: keyboardDragActivator, ...pointerDragListeners } = listeners ?? {};

    useLayoutEffect(() => {
      if (!rootRef.current) return;
      rootRef.current.style.transform = CSS.Transform.toString(transform) ?? '';
      rootRef.current.style.transition = transition ?? '';
    }, [transform, transition]);

    if (!card) return null;

    const cover    = card.cover ?? { type: 'none' as const, size: 'half' as const };
    const hasCover = cover.type !== 'none';
    const isFull   = hasCover && cover.size === 'full';
    const coverBg  = cover.type === 'color' ? cover.color
                   : cover.type === 'image' ? cover.image
                   : undefined;

    const cardMemberIds = card.memberIds ?? [];
    const isSelected    = selectedCardIds.includes(cardId);
    const isNew         = Date.now() - new Date(card.createdAt).getTime() < 2000;

    // Card aging (board-menu toggle): fade cards untouched for a long time so stale
    // work stands out. Two steps by idle age; never applied to completed cards or
    // while dragging/selected (where the styling would fight the active state).
    const idleDays = (Date.now() - new Date(card.updatedAt).getTime()) / 86_400_000;
    const agingClass =
      cardAgingEnabled && !card.completed && !isDragging && !isSelected
        ? idleDays > 30 ? 'opacity-50'
        : idleDays > 14 ? 'opacity-75'
        : ''
        : '';

    function openQuickEdit() {
      const rect = rootRef.current?.getBoundingClientRect();
      const x = rect ? Math.min(rect.right + 4, window.innerWidth - 212) : 100;
      const y = rect ? rect.top : 100;
      setQuickEditPos({ x, y });
    }

    // Trello-style shortcuts while the card's open-target is focused.
    function onCardKeyDown(e: React.KeyboardEvent) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (e.shiftKey) toggleCardSelection(cardId); else setActiveCardModal(cardId);
          break;
        case ' ': // space → toggle complete
          e.preventDefault();
          updateCard(cardId, { completed: !card.completed });
          break;
        case 'l': case 'L': // labels (in quick-edit)
        case 'e': case 'E': // quick edit
          e.preventDefault(); openQuickEdit();
          break;
        case 'd': case 'D': // due date / details
          e.preventDefault(); setActiveCardModal(cardId);
          break;
        case 'c': case 'C': // archive (undoable)
          e.preventDefault(); archiveCardWithUndo(cardId);
          break;
        case 'm': case 'M': // members (live in the card modal)
          e.preventDefault(); setActiveCardModal(cardId);
          break;
      }
    }

    // Click selection model: Cmd/Ctrl-click toggles, Shift-click range-selects,
    // a plain click opens the card.
    function onCardClick(e: React.MouseEvent | React.KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) { toggleCardSelection(cardId); return; }
      if (e.shiftKey) { selectCardRange(cardId); return; }
      setActiveCardModal(cardId);
    }

    return (
      <>
        <div
          ref={(node) => {
            setNodeRef(node);
            (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          {...pointerDragListeners}
          onContextMenu={(e) => { e.preventDefault(); setQuickEditPos({ x: e.clientX, y: e.clientY }); }}
          className={[
            `${isNew ? 'anim-card-enter' : ''} group relative bg-[var(--card-bg)] rounded-lg cursor-pointer overflow-hidden`,
            'shadow-[0_1px_1px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]',
            'border-2 border-transparent hover:border-[var(--accent)]/50',
            // Trello-style hover lift: elevate the shadow on hover. Transition is
            // limited to colour/shadow only so it never animates the drag transform.
            'hover:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.45)]',
            'transition-[border-color,box-shadow,background-color] duration-100',
            isDragging ? 'opacity-30 ring-2 ring-trello-accent' : '',
            isSelected ? 'ring-2 ring-trello-accent ring-offset-2 ring-offset-trello-listBg' : '',
            agingClass,
          ].join(' ')}
        >
          {/* Single activatable open-target overlay — a real <button> with no
              interactive descendants. Replaces the old role=button on the card root
              so the drag handle / labels / pencil are no longer nested inside a
              button (fixes the axe nested-interactive violation). Sits above the
              content (z-1) but below the action controls (z-2). Hosts the
              focused-card shortcuts. */}
          <button
            type="button"
            data-list-id={listId}
            aria-label={`Open card: ${card.title}`}
            onClick={onCardClick}
            onKeyDown={onCardKeyDown}
            className="absolute inset-0 z-[1] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-trello-accent"
          />

          {/* Cover band — real <img> for image covers, colour fill otherwise */}
          {hasCover && cover.type === 'image' && cover.image ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user cover URLs; next/image's domain allowlist would break them */}
              <img src={cover.image} alt="" loading="lazy" decoding="async" className="w-full h-36 object-cover rounded-t-lg" />
              {isFull && (
                <p className={[
                  'absolute bottom-2 left-3 right-10 text-sm font-medium leading-snug',
                  '[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
                  cover.textColor === 'dark' ? 'text-slate-900' : 'text-white',
                ].join(' ')}>
                  {card.title}
                </p>
              )}
            </div>
          ) : hasCover && (
            <div
              className={`relative w-full ${isFull ? 'h-24' : 'h-8'}`}
              style={coverBg ? { background: coverBg } : undefined}
            >
              {isFull && (
                <p className={[
                  'absolute bottom-2 left-3 right-10 text-sm font-medium leading-snug',
                  '[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
                  cover.textColor === 'dark' ? 'text-slate-900' : 'text-white',
                ].join(' ')}>
                  {card.title}
                </p>
              )}
            </div>
          )}

          {!isFull && (
            <>
              {/* Label strip */}
              {cardLabels.length > 0 && (
                <div className="relative z-[2] px-3 pt-2 pb-0 flex flex-wrap gap-1">
                  {cardLabels.map((label) => (
                    <button
                      key={label.id}
                      title={label.name}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); toggleLabels(); }}
                      aria-label={labelsExpanded ? `Collapse label: ${label.name}` : `Expand label: ${label.name}`}
                      className={`transition-all duration-150 text-white text-[11px] font-medium leading-none ${
                        labelsExpanded ? 'h-5 px-2 min-w-10 rounded' : 'h-2 w-10 rounded-full'
                      }`}
                      style={{ background: LABEL_VAR[label.color] }}
                    >
                      {labelsExpanded ? label.name : null}
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <p className="px-3 py-1.5 pr-8 text-sm font-medium leading-snug text-[var(--text-primary)] break-words">
                {card.title}
              </p>

              {/* Badges — CardBadges returns null when nothing to show */}
              <CardBadges card={card} />

              {/* Member avatar stack */}
              {cardMemberIds.length > 0 && (
                <div className="px-3 pb-2 flex justify-end">
                  <div className="flex items-center">
                    {cardMemberIds.slice(0, 3).map((memberId, i) => (
                      <div key={memberId} className={i > 0 ? '-ml-1.5' : ''}>
                        <MemberAvatar memberId={memberId} size="xs" />
                      </div>
                    ))}
                    {cardMemberIds.length > 3 && (
                      <div className="-ml-1.5 h-5 min-w-5 px-1 rounded-full bg-trello-cardHover text-trello-textSubtle text-[10px] font-semibold flex items-center justify-center border border-trello-cardBg">
                        +{cardMemberIds.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Keyboard drag handle — visually hidden until focused (mouse/touch users
              drag the card body directly). Carries the sortable's keyboard activator
              + ARIA, so keyboard users can pick up the card and move it with arrows. */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={keyboardDragActivator as React.KeyboardEventHandler<HTMLButtonElement> | undefined}
            aria-label={`Drag card: ${card.title}. Press Space or Enter, then use arrow keys to move; Space or Enter to drop.`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-1 focus:left-1 focus:z-20 focus:h-7 focus:w-7 focus:rounded-full focus:bg-[var(--surface-raised)] focus:flex focus:items-center focus:justify-center focus:shadow-md"
          >
            <GripVertical className="h-3.5 w-3.5 text-trello-textSecondary" />
          </button>

          {/* Edit pencil — always rendered, visible on hover (mouse affordance).
              tabIndex -1: the card body is the keyboard path to open the modal, so
              the pencil is not a separate tab stop. */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setActiveCardModal(cardId); }}
            className="absolute top-1 right-1 z-[2] h-7 w-7 rounded-full bg-[var(--surface-raised)] flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 hover:brightness-125 transition-opacity"
            aria-label={`Edit card: ${card.title}`}
            tabIndex={-1}
          >
            <Pencil className="h-3 w-3 text-trello-textSecondary" />
          </button>
        </div>

        {quickEditPos && (
          <QuickEditPopover
            cardId={cardId}
            isSelected={isSelected}
            position={quickEditPos}
            onClose={() => setQuickEditPos(null)}
            onOpenModal={() => { setActiveCardModal(cardId); setQuickEditPos(null); }}
            onToggleSelect={() => toggleCardSelection(cardId)}
          />
        )}
      </>
    );
  },
  (prev, next) => prev.cardId === next.cardId && prev.listId === next.listId && prev.boardId === next.boardId,
);
