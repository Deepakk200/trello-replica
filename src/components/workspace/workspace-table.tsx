'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { CardModal } from '@/components/card/card-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { LABEL_CLASS } from '@/lib/colors';
import type { Card, ID } from '@/types';

/**
 * Workspace-level Table view: every card across all (non-closed) boards in the
 * active workspace, with a Board column + per-board filter. Sortable; click a row
 * to open the card. Reads the same Zustand store as the board-level table; no DB.
 */

type SortCol = 'title' | 'board' | 'list' | 'due' | 'created';
type SortDir = 'asc' | 'desc';

type Row = Card & { _boardId: ID; _boardTitle: string; _boardBg: string; _listTitle: string };

function relDate(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-40 shrink-0" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />;
}
function Th({ label, col, sortCol, sortDir, onSort }: {
  label: string; col: SortCol; sortCol: SortCol; sortDir: SortDir; onSort: (c: SortCol) => void;
}) {
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide cursor-pointer hover:text-trello-text select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">{label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} /></span>
    </th>
  );
}

export function WorkspaceTable() {
  const [sortCol, setSortCol] = useState<SortCol>('due');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [boardFilter, setBoardFilter] = useState<ID | 'all'>('all');
  const [modalCardId, setModalCardId] = useState<ID | null>(null);

  const labels = useBoardStore((s) => s.labels);

  // Select STABLE store records and derive in useMemo. Selectors that build new
  // objects/arrays return a fresh reference every call, breaking snapshot caching
  // (even with useShallow on mapped objects) → infinite render loop. Same pattern
  // as planner-view / workspace-calendar.
  const ws = useBoardStore((s) => s.activeWorkspaceId);
  const boardsById = useBoardStore((s) => s.boards);
  const listsById = useBoardStore((s) => s.lists);
  const cardsById = useBoardStore((s) => s.cards);

  // All boards in the active workspace (exclude closed boards).
  const boards = useMemo(
    () => Object.values(boardsById)
      .filter((b) => !b.isArchived && (!ws || b.workspaceId === ws))
      .map((b) => ({ id: b.id, title: b.title, background: b.background })),
    [boardsById, ws],
  );

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const b of Object.values(boardsById)) {
      if (b.isArchived || (ws && b.workspaceId !== ws)) continue;
      for (const listId of b.listIds) {
        const list = listsById[listId];
        if (!list || list.isArchived) continue;
        for (const cardId of list.cardIds) {
          const card = cardsById[cardId];
          if (card && !card.isArchived) {
            out.push({ ...card, _boardId: b.id, _boardTitle: b.title, _boardBg: b.background, _listTitle: list.title });
          }
        }
      }
    }
    return out;
  }, [boardsById, listsById, cardsById, ws]);

  const filtered = useMemo(
    () => (boardFilter === 'all' ? rows : rows.filter((r) => r._boardId === boardFilter)),
    [rows, boardFilter],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'title') cmp = a.title.localeCompare(b.title);
      if (sortCol === 'board') cmp = a._boardTitle.localeCompare(b._boardTitle);
      if (sortCol === 'list') cmp = a._listTitle.localeCompare(b._listTitle);
      if (sortCol === 'due') cmp = (a.dueDate ?? '￿').localeCompare(b.dueDate ?? '￿');
      if (sortCol === 'created') cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  const today = new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Header + board filter */}
      <div className="px-5 pt-5 pb-3 shrink-0">
        <h1 className="text-xl font-semibold text-trello-text mb-3">Table</h1>
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={boardFilter === 'all'} onClick={() => setBoardFilter('all')}>All boards</FilterPill>
          {boards.map((b) => (
            <FilterPill key={b.id} active={boardFilter === b.id} onClick={() => setBoardFilter(b.id)}>
              <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: b.background }} />
              {b.title}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {sorted.length === 0 ? (
          <EmptyState
            title="No cards yet"
            subtitle="Cards from every board in this workspace will show here. Create a card on any board to get started."
          />
        ) : (
          <table className="w-full min-w-[920px] border-collapse">
            <thead className="sticky top-0 bg-trello-listBg z-10">
              <tr className="border-b border-trello-borderSubtle">
                <Th label="Title" col="title" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <Th label="Board" col="board" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <Th label="List" col="list" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide whitespace-nowrap">Labels</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-trello-textSubtle uppercase tracking-wide whitespace-nowrap">Members</th>
                <Th label="Due" col="due" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                <Th label="Created" col="created" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((card) => {
                const isOverdue = card.dueDate && !card.completed && new Date(card.dueDate) < today;
                const isDueSoon = card.dueDate && !card.completed && !isOverdue &&
                  (new Date(card.dueDate).getTime() - today.getTime()) < 86_400_000;
                return (
                  <tr
                    key={card.id}
                    onClick={() => setModalCardId(card.id)}
                    className="border-b border-trello-borderSubtle hover:bg-trello-cardHover cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 max-w-75"><span className="text-sm text-trello-text line-clamp-1">{card.title}</span></td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-trello-textSecondary">
                        <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: card._boardBg }} />
                        {card._boardTitle}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs bg-trello-cardHover text-trello-textSecondary rounded px-2 py-0.5">{card._listTitle}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {card.labelIds.slice(0, 4).map((lid) => {
                          const lbl = labels[lid]; if (!lbl) return null;
                          return <span key={lid} title={lbl.name} className={`h-2 w-6 rounded-sm shrink-0 ${LABEL_CLASS[lbl.color]}`} />;
                        })}
                        {card.labelIds.length > 4 && <span className="text-[10px] text-trello-textSubtle">+{card.labelIds.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center">
                        {(card.memberIds ?? []).slice(0, 3).map((mid, i) => (
                          <div key={mid} className={i > 0 ? '-ml-1.5' : ''}><MemberAvatar memberId={mid} size="xs" /></div>
                        ))}
                        {(card.memberIds ?? []).length > 3 && <span className="text-[10px] text-trello-textSubtle ml-0.5">+{(card.memberIds ?? []).length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {card.dueDate ? (
                        <span className={`text-xs ${card.completed ? 'text-trello-success' : isOverdue ? 'text-trello-danger' : isDueSoon ? 'text-trello-warning' : 'text-trello-textSecondary'}`}>
                          {fmtDate(card.dueDate)}
                        </span>
                      ) : <span className="text-trello-textSubtle text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><span className="text-xs text-trello-textSubtle">{relDate(card.createdAt)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalCardId && <CardModal cardId={modalCardId} onClose={() => setModalCardId(null)} />}
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? 'bg-trello-accent/15 text-trello-accent' : 'bg-white/5 text-trello-textSecondary hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
