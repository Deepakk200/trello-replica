'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
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

export const CardItem = memo(
  function CardItem({ boardId, listId, cardId }: { boardId: ID; listId: ID; cardId: ID }) {
    void boardId;

    const card           = useBoardStore((s) => s.cards[cardId]);
    const cardLabels     = useBoardStore(
      useShallow((s) => (s.cards[cardId]?.labelIds ?? []).map((id) => s.labels[id]).filter(Boolean)),
    );
    const selectedCardIds    = useBoardStore((s) => s.selectedCardIds);
    const toggleCardSelection = useBoardStore((s) => s.toggleCardSelection);
    const setActiveCardModal  = useBoardStore((s) => s.setActiveCardModal);
    const { expanded: labelsExpanded, toggle: toggleLabels } = useLabelExpansion();

    const [quickEditPos, setQuickEditPos] = useState<{ x: number; y: number } | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
      useSortable({ id: cardId, data: { type: 'card', listId } });

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

    return (
      <>
        <div
          ref={(node) => {
            setNodeRef(node);
            (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            if (e.shiftKey) toggleCardSelection(cardId);
            else setActiveCardModal(cardId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.shiftKey ? toggleCardSelection(cardId) : setActiveCardModal(cardId);
            }
          }}
          onContextMenu={(e) => { e.preventDefault(); setQuickEditPos({ x: e.clientX, y: e.clientY }); }}
          aria-label={`Open card: ${card.title}`}
          className={[
            `${isNew ? 'anim-card-enter' : ''} group relative bg-[var(--card-bg)] rounded-lg cursor-pointer overflow-hidden`,
            'shadow-[0_1px_1px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)]',
            'border-2 border-transparent hover:border-[var(--accent)]/50',
            'transition-colors duration-75',
            isDragging ? 'opacity-30 ring-2 ring-trello-accent' : '',
            isSelected ? 'ring-2 ring-trello-accent ring-offset-2 ring-offset-trello-listBg' : '',
          ].join(' ')}
        >
          {/* Cover band — real <img> for image covers, colour fill otherwise */}
          {hasCover && cover.type === 'image' && cover.image ? (
            <div className="relative w-full">
              <img src={cover.image} alt="" className="w-full h-36 object-cover rounded-t-lg" />
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
                <div className="px-3 pt-2 pb-0 flex flex-wrap gap-1">
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

          {/* Edit pencil — always rendered, visible on hover/focus */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setActiveCardModal(cardId); }}
            className="absolute top-1 right-1 h-7 w-7 rounded-full bg-[var(--surface-raised)] flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:brightness-125 transition-opacity"
            aria-label={`Edit card: ${card.title}`}
            tabIndex={0}
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
