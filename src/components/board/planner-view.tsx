'use client';

import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { Card, ID } from '@/types';

type ColumnId = 'today' | 'this-week' | 'later';

type PlannerCard = Pick<Card, 'id' | 'title' | 'dueDate' | 'completed'> & { listTitle: string };

function classifyCard(dueDate: string | null, now: Date): ColumnId | 'no-date' {
  if (!dueDate) return 'no-date';
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 'no-date';

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  if (due <= todayEnd) return 'today';
  if (due <= weekEnd) return 'this-week';
  return 'later';
}

export function PlannerView() {
  const createCard = useBoardStore((s) => s.createCard);

  // Flatten all (non-archived) cards on the active board, tagged with their list title.
  const { allCards, firstListId } = useBoardStore(
    useShallow((s) => {
      const boardId = s.activeBoardId ?? Object.keys(s.boards)[0] ?? null;
      const board = boardId ? s.boards[boardId] : null;
      if (!board) return { allCards: [] as PlannerCard[], firstListId: null as ID | null };

      const lists = board.listIds
        .map((lid) => s.lists[lid])
        .filter((l) => l && !l.isArchived);

      const cards: PlannerCard[] = [];
      for (const list of lists) {
        for (const cid of list!.cardIds) {
          const c = s.cards[cid];
          if (!c || c.isArchived) continue;
          cards.push({ id: c.id, title: c.title, dueDate: c.dueDate, completed: c.completed, listTitle: list!.title });
        }
      }
      return { allCards: cards, firstListId: lists[0]?.id ?? null };
    }),
  );

  const now = useMemo(() => new Date(), []);

  const columns = useMemo(() => {
    const buckets: Record<ColumnId, PlannerCard[]> = { today: [], 'this-week': [], later: [] };
    for (const card of allCards) {
      const col = classifyCard(card.dueDate, now);
      if (col !== 'no-date') buckets[col].push(card);
    }
    return [
      { id: 'today' as const,     label: 'Today',     headerBg: '#533E00', cards: buckets.today },
      { id: 'this-week' as const, label: 'This Week', headerBg: '#164B35', cards: buckets['this-week'] },
      { id: 'later' as const,     label: 'Later',     headerBg: '#1E1F21', cards: buckets.later },
    ];
  }, [allCards, now]);

  function handleAddCard() {
    if (!firstListId) return;
    const title = window.prompt('Card title:');
    if (!title?.trim()) return;
    createCard(firstListId, title.trim());
  }

  return (
    <div className="flex-1 overflow-x-auto px-3 py-3 flex gap-3 items-start">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 w-[272px] flex flex-col rounded-xl overflow-hidden"
          style={{ background: '#101204' }}
        >
          {/* Column header */}
          <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: col.headerBg }}>
            <span className="text-sm font-semibold text-white">{col.label}</span>
            <span className="text-xs text-white/60 bg-white/10 rounded-full px-2 py-0.5">
              {col.cards.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2 p-2">
            {col.cards.map((card) => (
              <div
                key={card.id}
                className="bg-[#22272B] border border-white/10 rounded-lg px-3 py-2.5
                           cursor-pointer hover:border-white/20 transition-colors"
              >
                <p className="text-sm text-white leading-snug">{card.title}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-white/50">
                  {card.dueDate && (
                    <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${
                      new Date(card.dueDate) < now && !card.completed
                        ? 'bg-red-600/30 text-red-300'
                        : 'bg-white/10'
                    }`}>
                      📅 {new Date(card.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span className="text-white/40">{card.listTitle}</span>
                </div>
              </div>
            ))}

            {/* Add a card */}
            <button
              onClick={handleAddCard}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white
                         hover:bg-white/10 rounded-lg px-2 py-2 transition-colors w-full text-left"
            >
              <Plus size={14} />
              Add a card
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
