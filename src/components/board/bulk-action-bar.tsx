'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowRight, Tag, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';

const LABEL_DOT: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-emerald-500',
  blue: 'bg-sky-500',
  yellow: 'bg-amber-400',
  purple: 'bg-violet-500',
  orange: 'bg-orange-500',
  sky: 'bg-sky-400',
  lime: 'bg-lime-500',
  pink: 'bg-pink-500',
  black: 'bg-slate-800',
};

export function BulkActionBar() {
  const { selectedCardIds, boards, lists, labels, activeBoardId } = useBoardStore(
    useShallow((s) => ({
      selectedCardIds: s.selectedCardIds,
      boards: s.boards,
      lists: s.lists,
      labels: s.labels,
      activeBoardId: s.activeBoardId,
    })),
  );
  const bulkArchiveCards = useBoardStore((s) => s.bulkArchiveCards);
  const bulkMoveCards = useBoardStore((s) => s.bulkMoveCards);
  const bulkAddLabelToCards = useBoardStore((s) => s.bulkAddLabelToCards);
  const clearCardSelection = useBoardStore((s) => s.clearCardSelection);

  const [open, setOpen] = useState<'move' | 'label' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeBoard = activeBoardId ? boards[activeBoardId] : null;
  const boardLists = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.listIds.map((listId) => lists[listId]).filter(Boolean);
  }, [activeBoard, lists]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (selectedCardIds.length === 0) return null;

  return (
    <div ref={rootRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="relative flex items-center gap-4 bg-trello-surfaceOverlay rounded-full shadow-2xl border border-trello-border px-5 py-3">
        <span className="text-sm text-trello-text font-medium">{selectedCardIds.length} cards selected</span>
        <div className="h-5 w-px bg-trello-border" />

        <div className="relative">
          <button
            onClick={() => setOpen((current) => (current === 'move' ? null : 'move'))}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-trello-cardHover hover:bg-trello-cardHover/80 transition-colors"
          >
            <ArrowRight className="h-4 w-4" /> Move
          </button>
          {open === 'move' && (
            <div className="absolute bottom-full left-0 mb-2 min-w-48 rounded-xl border border-trello-border bg-trello-surfaceRaised shadow-2xl overflow-hidden">
              {boardLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => { bulkMoveCards(selectedCardIds, list.id); setOpen(null); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-trello-text hover:bg-trello-cardHover transition-colors"
                >
                  {list.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((current) => (current === 'label' ? null : 'label'))}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-trello-cardHover hover:bg-trello-cardHover/80 transition-colors"
          >
            <Tag className="h-4 w-4" /> Label
          </button>
          {open === 'label' && (
            <div className="absolute bottom-full left-0 mb-2 min-w-52 rounded-xl border border-trello-border bg-trello-surfaceRaised shadow-2xl overflow-hidden p-1">
              {Object.values(labels).map((label) => (
                <button
                  key={label.id}
                  onClick={() => { bulkAddLabelToCards(selectedCardIds, label.id); setOpen(null); }}
                  className="w-full px-3 py-2 rounded-lg text-left text-sm text-trello-text hover:bg-trello-cardHover transition-colors flex items-center gap-2"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${LABEL_DOT[label.color] ?? 'bg-slate-400'}`} />
                  {label.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => { bulkArchiveCards(selectedCardIds); clearCardSelection(); }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/10 text-trello-danger hover:bg-red-500/20 transition-colors"
        >
          <Archive className="h-4 w-4" /> Archive
        </button>

        <button
          onClick={clearCardSelection}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-trello-cardHover hover:bg-trello-cardHover/80 transition-colors"
        >
          <X className="h-4 w-4" /> Clear
        </button>
      </div>
    </div>
  );
}