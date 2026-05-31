'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { ID, LabelColor } from '@/types';
import { CardBadges } from './card-badges';
import { QuickEditPopover } from './quick-edit-popover';

const LABEL_VAR: Record<LabelColor, string> = {
  green: 'var(--label-green)', yellow: 'var(--label-yellow)', orange: 'var(--label-orange)',
  red:   'var(--label-red)',   purple: 'var(--label-purple)', blue:   'var(--label-blue)',
  sky:   'var(--label-sky)',   lime:   'var(--label-lime)',   pink:   'var(--label-pink)',
  black: 'var(--label-black)',
};

const LABEL_CLASS: Record<LabelColor, string> = {
  green: 'bg-[var(--label-green)]', yellow: 'bg-[var(--label-yellow)]', orange: 'bg-[var(--label-orange)]',
  red: 'bg-[var(--label-red)]', purple: 'bg-[var(--label-purple)]', blue: 'bg-[var(--label-blue)]',
  sky: 'bg-[var(--label-sky)]', lime: 'bg-[var(--label-lime)]', pink: 'bg-[var(--label-pink)]',
  black: 'bg-[var(--label-black)]',
};

const COVER_COLOR_CLASS: Record<string, string> = {
  '#10b981': 'bg-[#10b981]',
  '#facc15': 'bg-[#facc15]',
  '#fb923c': 'bg-[#fb923c]',
  '#ef4444': 'bg-[#ef4444]',
  '#a855f7': 'bg-[#a855f7]',
  '#2563eb': 'bg-[#2563eb]',
  '#22d3ee': 'bg-[#22d3ee]',
  '#a3e635': 'bg-[#a3e635]',
  '#f472b6': 'bg-[#f472b6]',
  '#334155': 'bg-[#334155]',
};

const COVER_IMAGE_CLASS: Record<string, string> = {
  'linear-gradient(135deg,#0079bf,#5067c5)': 'bg-[linear-gradient(135deg,#0079bf,#5067c5)]',
  'linear-gradient(135deg,#d29034,#e67e22)': 'bg-[linear-gradient(135deg,#d29034,#e67e22)]',
  'linear-gradient(135deg,#519839,#70a246)': 'bg-[linear-gradient(135deg,#519839,#70a246)]',
  'linear-gradient(135deg,#b04632,#e74c3c)': 'bg-[linear-gradient(135deg,#b04632,#e74c3c)]',
  'linear-gradient(135deg,#89609e,#8e44ad)': 'bg-[linear-gradient(135deg,#89609e,#8e44ad)]',
  'linear-gradient(135deg,#1d6fa4,#27ae60)': 'bg-[linear-gradient(135deg,#1d6fa4,#27ae60)]',
};

function coverClass(cover: { type: 'none' | 'color' | 'image'; color?: string; image?: string }) {
  if (cover.type === 'color' && cover.color) return COVER_COLOR_CLASS[cover.color] ?? 'bg-trello-cardHover';
  if (cover.type === 'image' && cover.image) return COVER_IMAGE_CLASS[cover.image] ?? 'bg-trello-cardHover';
  return 'bg-trello-cardHover';
}

export const CardItem = memo(
  function CardItem({ boardId, listId, cardId }: { boardId: ID; listId: ID; cardId: ID }) {
    void boardId;

    const card = useBoardStore((s) => s.cards[cardId]);
    const cardLabels = useBoardStore(
      useShallow((s) => (s.cards[cardId]?.labelIds ?? []).map((id) => s.labels[id]).filter(Boolean)),
    );
    const selectedCardIds = useBoardStore((s) => s.selectedCardIds);
    const toggleCardSelection = useBoardStore((s) => s.toggleCardSelection);
    const setActiveCardModal = useBoardStore((s) => s.setActiveCardModal);
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

    const cover       = card.cover ?? { type: 'none' as const, size: 'half' as const };
    const hasCover    = cover.type !== 'none';
    const isFull      = hasCover && cover.size === 'full';

    const cardMemberIds = card.memberIds ?? [];
    const isSelected = selectedCardIds.includes(cardId);

    return (
      <>
        <div
          ref={(node) => {
            setNodeRef(node);
            rootRef.current = node;
          }}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            if (e.shiftKey) toggleCardSelection(cardId);
            else setActiveCardModal(cardId);
          }}
          onContextMenu={(e) => { e.preventDefault(); setQuickEditPos({ x: e.clientX, y: e.clientY }); }}
          aria-label={`Open card: ${card.title}`}
          className={[
            'anim-card-enter group relative bg-trello-cardBg hover:bg-trello-cardHover rounded-lg',
            'shadow-card hover:shadow-card-hover',
            'cursor-pointer transition-all duration-100',
            hasCover ? 'overflow-hidden' : 'px-3 py-2',
            isDragging ? 'opacity-30 ring-2 ring-trello-accent' : '',
            isSelected ? 'ring-2 ring-trello-accent ring-offset-2 ring-offset-trello-listBg' : '',
          ].join(' ')}
        >
          {hasCover && (
            <div className={`relative w-full ${isFull ? 'h-24' : 'h-8'} ${coverClass(cover)}`}>
              {isFull && (
                <p className={`absolute bottom-2 left-3 right-10 text-sm font-medium leading-snug [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] ${cover.textColor === 'dark' ? 'text-slate-900' : 'text-white'}`}>
                  {card.title}
                </p>
              )}
            </div>
          )}

          {!isFull && (
            <div className={hasCover ? 'px-3 py-2' : ''}>
              {cardLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5" aria-hidden="true">
                  {cardLabels.map((label) => (
                    <span
                      key={label.id}
                      title={label.name}
                      className={`h-2 w-10 rounded-sm ${LABEL_CLASS[label.color]}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm leading-snug text-trello-text pr-5">{card.title}</p>
              <CardBadges card={card} />

              {/* Avatar stack */}
              {cardMemberIds.length > 0 && (
                <div className="flex items-center justify-end mt-1.5">
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
            </div>
          )}

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setActiveCardModal(cardId); }}
            className="absolute top-2 right-2 p-0.5 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-trello-cardHover transition-opacity"
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
