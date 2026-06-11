'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { CardModal } from '@/components/card/card-modal';
import type { ID } from '@/types';
import { LABEL_CLASS } from '@/lib/colors';

type SortCol = 'number' | 'title' | 'list' | 'due' | 'created';
type SortDir = 'asc' | 'desc';

function relDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export function TableView({ boardId }: { boardId: ID }) {
  const [sortCol, setSortCol] = useState<SortCol>('number');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modalCardId, setModalCardId] = useState<ID | null>(null);
  const board = useBoardStore((s) => s.boards[boardId]);
  const lists = useBoardStore((s) => s.lists);
  const cards = useBoardStore((s) => s.cards);
  const labels = useBoardStore((s) => s.labels);

  const { rows, listMap } = useMemo(() => {
    if (!board) return { rows: [], listMap: {} as Record<ID, string> };
    const listMap: Record<ID, string> = {};
    const rows = [];
    for (const listId of board.listIds) {
      const list = lists[listId];
      if (!list || list.isArchived) continue;
      listMap[listId] = list.title;
      for (const cardId of list.cardIds) {
        const card = cards[cardId];
        if (card && !card.isArchived) rows.push(card);
      }
    }
    return { rows, listMap };
  }, [board, cards, lists]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'number')  cmp = a.number - b.number;
      if (sortCol === 'title')   cmp = a.title.localeCompare(b.title);
      if (sortCol === 'list')    cmp = (listMap[a.listId] ?? '').localeCompare(listMap[b.listId] ?? '');
      if (sortCol === 'due')     cmp = (a.dueDate ?? '￿').localeCompare(b.dueDate ?? '￿');
      if (sortCol === 'created') cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir, listMap]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-40 shrink-0" />;
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 shrink-0" />
      : <ChevronDown className="w-3 h-3 shrink-0" />;
  }

  const Th = ({ label, col }: { label: string; col: SortCol }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide cursor-pointer hover:text-trello-text select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
    </th>
  );

  const today = new Date();

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-275 border-collapse">
        <thead className="sticky top-0 bg-trello-listBg z-10">
          <tr className="border-b border-trello-borderSubtle">
            <Th label="#"       col="number"  />
            <Th label="Title"   col="title"   />
            <Th label="List"    col="list"    />
            <th className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide whitespace-nowrap">Labels</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide whitespace-nowrap">Members</th>
            <Th label="Due"     col="due"     />
            <Th label="Created" col="created" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((card) => {
            const isOverdue = card.dueDate && !card.completed && new Date(card.dueDate) < today;
            const isDueSoon = card.dueDate && !card.completed && !isOverdue &&
              (new Date(card.dueDate).getTime() - Date.now()) < 86400000;
            return (
              <tr
                key={card.id}
                onClick={() => setModalCardId(card.id)}
                className="border-b border-trello-borderSubtle hover:bg-trello-cardHover cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="text-xs font-mono text-trello-textSubtle">#{card.number}</span>
                </td>
                <td className="px-4 py-2.5 max-w-75">
                  <span className="text-sm text-trello-text line-clamp-1">{card.title}</span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="text-xs bg-trello-cardHover text-trello-textSecondary rounded px-2 py-0.5">
                    {listMap[card.listId] ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    {card.labelIds.slice(0, 4).map((lid) => {
                      const lbl = labels[lid]; if (!lbl) return null;
                      return (
                        <span
                          key={lid}
                          title={lbl.name}
                          className={`h-2 w-6 rounded-sm shrink-0 ${LABEL_CLASS[lbl.color]}`}
                        />
                      );
                    })}
                    {card.labelIds.length > 4 && (
                      <span className="text-[10px] text-trello-textSubtle">+{card.labelIds.length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center">
                    {(card.memberIds ?? []).slice(0, 3).map((mid, i) => (
                      <div key={mid} className={i > 0 ? '-ml-1.5' : ''}>
                        <MemberAvatar memberId={mid} size="xs" />
                      </div>
                    ))}
                    {(card.memberIds ?? []).length > 3 && (
                      <span className="text-[10px] text-trello-textSubtle ml-0.5">
                        +{(card.memberIds ?? []).length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {card.dueDate ? (
                    <span className={`text-xs ${
                      card.completed  ? 'text-trello-success' :
                      isOverdue       ? 'text-trello-danger'  :
                      isDueSoon       ? 'text-trello-warning' :
                      'text-trello-textSecondary'
                    }`}>
                      {fmtDate(card.dueDate)}
                    </span>
                  ) : (
                    <span className="text-trello-textSubtle text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="text-xs text-trello-textSubtle">{relDate(card.createdAt)}</span>
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-trello-textSubtle text-sm">
                No cards in this board yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
    </div>
  );
}
