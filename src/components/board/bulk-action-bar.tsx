'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowRight, Calendar, Tag, Tags, UserPlus, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import {
  bulkArchiveWithUndo, bulkMoveWithUndo, bulkAddLabelWithUndo,
  bulkRemoveLabelWithUndo, bulkSetDueWithUndo, bulkAddMemberWithUndo,
} from '@/features/undo/archive-actions';
import { LABEL_BG } from '@/lib/colors';
import type { LabelColor } from '@/types';

type Menu = 'move' | 'label' | 'removeLabel' | 'due' | 'member' | null;

/** Quick due presets — return an ISO string for the chosen relative day (end of day UTC). */
function dueAtDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

export function BulkActionBar() {
  const { selectedCardIds, boards, lists, labels, members, activeBoardId } = useBoardStore(
    useShallow((s) => ({
      selectedCardIds: s.selectedCardIds,
      boards: s.boards,
      lists: s.lists,
      labels: s.labels,
      members: s.members,
      activeBoardId: s.activeBoardId,
    })),
  );
  const clearCardSelection = useBoardStore((s) => s.clearCardSelection);

  const [open, setOpen] = useState<Menu>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeBoard = activeBoardId ? boards[activeBoardId] : null;
  const boardLists = useMemo(() => {
    if (!activeBoard) return [];
    return activeBoard.listIds.map((listId) => lists[listId]).filter(Boolean);
  }, [activeBoard, lists]);
  const boardMembers = useMemo(() => {
    if (!activeBoard) return [];
    return (activeBoard.memberIds ?? []).map((id) => members[id]).filter(Boolean);
  }, [activeBoard, members]);

  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (selectedCardIds.length === 0) return null;

  const pillBtn = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-trello-cardHover hover:bg-trello-cardHover/80 transition-colors';
  const menuWrap = 'absolute bottom-full left-0 mb-2 min-w-48 rounded-xl border border-trello-border bg-trello-surfaceRaised shadow-2xl overflow-hidden p-1 max-h-72 overflow-y-auto cards-scroll';
  const menuRow = 'w-full px-3 py-2 rounded-lg text-left text-sm text-trello-text hover:bg-trello-cardHover transition-colors flex items-center gap-2';

  function toggle(menu: Menu) {
    setOpen((cur) => (cur === menu ? null : menu));
  }

  return (
    <div ref={rootRef} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="relative flex items-center gap-3 bg-trello-surfaceOverlay rounded-full shadow-2xl border border-trello-border px-5 py-3">
        <span className="text-sm text-trello-text font-medium whitespace-nowrap">{selectedCardIds.length} selected</span>
        <div className="h-5 w-px bg-trello-border" />

        {/* Move */}
        <div className="relative">
          <button onClick={() => toggle('move')} className={pillBtn}>
            <ArrowRight className="h-4 w-4" /> Move
          </button>
          {open === 'move' && (
            <div className={menuWrap}>
              {boardLists.map((list) => (
                <button key={list.id} onClick={() => { bulkMoveWithUndo(selectedCardIds, list.id); setOpen(null); }} className={menuRow}>
                  {list.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add label */}
        <div className="relative">
          <button onClick={() => toggle('label')} className={pillBtn}>
            <Tag className="h-4 w-4" /> Label
          </button>
          {open === 'label' && (
            <div className={menuWrap}>
              {Object.values(labels).map((label) => (
                <button key={label.id} onClick={() => { bulkAddLabelWithUndo(selectedCardIds, label.id); setOpen(null); }} className={menuRow}>
                  <span className={`h-2.5 w-2.5 rounded-full ${LABEL_BG[label.color as LabelColor] ?? 'bg-slate-400'}`} />
                  {label.name || <span className="text-trello-textSubtle italic">No name</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Remove label */}
        <div className="relative">
          <button onClick={() => toggle('removeLabel')} className={pillBtn}>
            <Tags className="h-4 w-4" /> Remove label
          </button>
          {open === 'removeLabel' && (
            <div className={menuWrap}>
              {Object.values(labels).map((label) => (
                <button key={label.id} onClick={() => { bulkRemoveLabelWithUndo(selectedCardIds, label.id); setOpen(null); }} className={menuRow}>
                  <span className={`h-2.5 w-2.5 rounded-full ${LABEL_BG[label.color as LabelColor] ?? 'bg-slate-400'}`} />
                  {label.name || <span className="text-trello-textSubtle italic">No name</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Set due date */}
        <div className="relative">
          <button onClick={() => toggle('due')} className={pillBtn}>
            <Calendar className="h-4 w-4" /> Due
          </button>
          {open === 'due' && (
            <div className={menuWrap}>
              <button onClick={() => { bulkSetDueWithUndo(selectedCardIds, dueAtDaysFromNow(0)); setOpen(null); }} className={menuRow}>Today</button>
              <button onClick={() => { bulkSetDueWithUndo(selectedCardIds, dueAtDaysFromNow(1)); setOpen(null); }} className={menuRow}>Tomorrow</button>
              <button onClick={() => { bulkSetDueWithUndo(selectedCardIds, dueAtDaysFromNow(7)); setOpen(null); }} className={menuRow}>Next week</button>
              <button onClick={() => { bulkSetDueWithUndo(selectedCardIds, null); setOpen(null); }} className={`${menuRow} text-trello-danger`}>Remove due date</button>
            </div>
          )}
        </div>

        {/* Add member */}
        {boardMembers.length > 0 && (
          <div className="relative">
            <button onClick={() => toggle('member')} className={pillBtn}>
              <UserPlus className="h-4 w-4" /> Member
            </button>
            {open === 'member' && (
              <div className={menuWrap}>
                {boardMembers.map((m) => (
                  <button key={m.id} onClick={() => { bulkAddMemberWithUndo(selectedCardIds, m.id); setOpen(null); }} className={menuRow}>
                    <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: m.color }}>{m.initials}</span>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => bulkArchiveWithUndo(selectedCardIds)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-red-500/10 text-trello-danger hover:bg-red-500/20 transition-colors"
        >
          <Archive className="h-4 w-4" /> Archive
        </button>

        <button onClick={clearCardSelection} className={pillBtn}>
          <X className="h-4 w-4" /> Clear
        </button>
      </div>
    </div>
  );
}
