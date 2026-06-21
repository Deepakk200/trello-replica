'use client';

import { useState } from 'react';
import {
  Archive, ArrowDownUp, ChevronDown, ChevronLeft, ChevronRight,
  Copy, Eye, MoveHorizontal, Palette, Plus, X, Zap,
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { archiveListWithUndo, archiveAllCardsWithUndo } from '@/features/undo/archive-actions';
import type { ID } from '@/types';

interface Props { listId: ID; onClose: () => void; onAddCard: () => void; }

type View = 'main' | 'move' | 'moveAll' | 'sort';

const SORT_OPTIONS = [
  { label: 'Date created (newest first)', by: 'created-desc' as const },
  { label: 'Date created (oldest first)', by: 'created-asc' as const },
  { label: 'Card name (alphabetically)', by: 'name' as const },
  { label: 'Due date', by: 'due' as const },
  { label: 'Label', by: 'label' as const },
];

const AUTOMATION_RULES = [
  'When a card is added to the list…',
  'Every day, sort list by…',
  'Every Monday, sort list by…',
  'Create a rule',
];

const row = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-trello-textSecondary hover:text-trello-text text-sm text-left';
const danger = 'w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-red-500/15 transition-colors text-trello-danger text-sm text-left';

export function ListActions({ listId, onClose, onAddCard }: Props) {
  const list = useBoardStore((s) => s.lists[listId]);
  const sortList = useBoardStore((s) => s.sortList);
  const copyList = useBoardStore((s) => s.copyList);
  const moveAllCards = useBoardStore((s) => s.moveAllCards);
  const toggleWatchList = useBoardStore((s) => s.toggleWatchList);
  const reorderListToPosition = useBoardStore((s) => s.reorderListToPosition);
  const watched = useBoardStore((s) => (s.watchedListIds ?? []).includes(listId));

  const boardLists = useBoardStore(useShallow((s) => {
    const board = list ? s.boards[list.boardId] : null;
    return (board?.listIds ?? [])
      .map((id) => s.lists[id])
      .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived);
  }));

  const [view, setView] = useState<View>('main');
  const [automationOpen, setAutomationOpen] = useState(false);

  if (!list) return null;

  const otherLists = boardLists.filter((l) => l.id !== listId);
  const currentIndex = boardLists.findIndex((l) => l.id === listId);

  const title =
    view === 'move' ? 'Move list' :
    view === 'moveAll' ? 'Move all cards in this list' :
    view === 'sort' ? 'Sort by' : 'List actions';

  return (
    <div
      role="dialog"
      aria-label="List actions"
      onPointerDown={(e) => e.stopPropagation()}
      className="
        w-[304px] max-w-[calc(100vw-1.5rem)] bg-trello-surfaceRaised rounded-xl shadow-2xl border border-trello-border overflow-hidden z-50
        absolute right-0 top-9
        max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:right-auto max-md:top-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl
      "
    >
      {/* Header — centered title, back button when in a submenu, X to close */}
      <div className="relative flex items-center justify-center h-11 px-2 border-b border-white/10">
        {view !== 'main' && (
          <button
            onClick={() => setView('main')}
            aria-label="Back"
            className="absolute left-2 h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 text-trello-textSecondary hover:text-trello-text"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <span className="text-sm font-semibold text-trello-text">{title}</span>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-2 h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 text-trello-textSecondary hover:text-trello-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-1.5 max-h-[min(70vh,520px)] overflow-y-auto cards-scroll">
        {view === 'main' && (
          <>
            <button className={row} onClick={() => { onAddCard(); onClose(); }}>
              <Plus className="h-4 w-4 shrink-0" /> Add card
            </button>
            <button className={row} onClick={() => { copyList(listId); onClose(); }}>
              <Copy className="h-4 w-4 shrink-0" /> Copy list
            </button>
            <button className={row} onClick={() => setView('move')}>
              <MoveHorizontal className="h-4 w-4 shrink-0" /> Move list
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            <button className={row} onClick={() => setView('moveAll')}>
              <ArrowDownUp className="h-4 w-4 shrink-0" /> Move all cards in this list
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            <button className={row} onClick={() => setView('sort')}>
              <ArrowDownUp className="h-4 w-4 shrink-0" /> Sort by…
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>

            <div className={row + ' cursor-default hover:bg-transparent hover:text-trello-textSecondary'}>
              <Eye className="h-4 w-4 shrink-0" /> Watch
              <button
                role="switch"
                aria-checked={watched}
                aria-label="Watch list"
                onClick={() => toggleWatchList(listId)}
                className={`ml-auto relative h-5 w-9 rounded-full transition-colors ${watched ? 'bg-trello-accent' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${watched ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="my-1 border-t border-white/10" />

            {/* Change list color — premium, visual only */}
            <button className={row + ' opacity-90'} disabled>
              <Palette className="h-4 w-4 shrink-0" /> Change list color
              <span className="ml-auto flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900">Premium</span>
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>

            <div className="my-1 border-t border-white/10" />

            {/* Automation — collapsible, visual only */}
            <button className={row} onClick={() => setAutomationOpen((v) => !v)}>
              <Zap className="h-4 w-4 shrink-0" /> Automation
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${automationOpen ? 'rotate-180' : ''}`} />
            </button>
            {automationOpen && (
              <div className="pl-2">
                {AUTOMATION_RULES.map((label) => (
                  <button key={label} className={row + ' text-xs'} disabled>
                    <Zap className="h-3.5 w-3.5 shrink-0 text-trello-textSubtle" /> {label}
                  </button>
                ))}
              </div>
            )}

            <div className="my-1 border-t border-white/10" />

            <button className={danger} onClick={() => { archiveListWithUndo(listId); onClose(); }}>
              <Archive className="h-4 w-4 shrink-0" /> Archive this list
            </button>
            <button className={danger} onClick={() => { archiveAllCardsWithUndo(listId); onClose(); }}>
              <Archive className="h-4 w-4 shrink-0" /> Archive all cards in this list
            </button>
          </>
        )}

        {view === 'move' && (
          <div className="flex flex-col gap-0.5">
            <p className="px-3 py-1.5 text-xs text-trello-textSubtle">Pick a position for the list.</p>
            {boardLists.map((_, i) => (
              <button
                key={i}
                className={row + (i === currentIndex ? ' bg-white/5 text-trello-text' : '')}
                onClick={() => { reorderListToPosition(listId, i); onClose(); }}
              >
                Position {i + 1}
                {i === currentIndex && <span className="ml-auto text-xs text-trello-textSubtle">current</span>}
              </button>
            ))}
          </div>
        )}

        {view === 'moveAll' && (
          <div className="flex flex-col gap-0.5">
            {otherLists.length === 0 ? (
              <p className="px-3 py-2 text-sm text-trello-textSubtle italic">No other lists to move cards to.</p>
            ) : otherLists.map((l) => (
              <button key={l.id} className={row} onClick={() => { moveAllCards(listId, l.id); onClose(); }}>
                {l.title}
              </button>
            ))}
          </div>
        )}

        {view === 'sort' && (
          <div className="flex flex-col gap-0.5">
            {SORT_OPTIONS.map(({ label, by }) => (
              <button key={by} className={row} onClick={() => { sortList(listId, by); onClose(); }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
