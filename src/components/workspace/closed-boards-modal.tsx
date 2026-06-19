'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, RotateCcw, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

/** Lists closed (soft-deleted) boards with Reopen + permanent Delete. */
export function ClosedBoardsModal({ onClose }: { onClose: () => void }) {
  const closedBoards = useBoardStore(
    useShallow((s) => Object.values(s.boards).filter((b) => b.isArchived)),
  );
  const reopenBoard = useBoardStore((s) => s.reopenBoard);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const [confirmId, setConfirmId] = useState<ID | null>(null);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="animate-backdrop-enter fixed inset-0 bg-black/60 z-50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Closed boards"
        className="anim-modal-enter fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] max-w-[calc(100vw-1.5rem)] max-h-[80vh] flex flex-col bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-trello-border shrink-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-trello-text">
            <Archive className="h-4 w-4" /> Closed boards
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2">
          {closedBoards.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-trello-textSubtle">No closed boards.</p>
          ) : (
            closedBoards.map((board) => (
              <div key={board.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-trello-cardHover/50">
                <span className="h-9 w-12 rounded shrink-0" style={{ background: board.background }} />
                <span className="min-w-0 flex-1 text-sm text-trello-text truncate">{board.title}</span>

                {confirmId === board.id ? (
                  <span className="flex items-center gap-1.5 text-xs shrink-0">
                    <span className="text-trello-textSubtle">Delete permanently?</span>
                    <button onClick={() => { deleteBoard(board.id); setConfirmId(null); }} className="text-trello-danger font-semibold hover:underline">Delete</button>
                    <button onClick={() => setConfirmId(null)} className="text-trello-textSubtle hover:underline">Cancel</button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => reopenBoard(board.id)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-trello-accent hover:bg-trello-accent/15 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reopen
                    </button>
                    <button
                      onClick={() => setConfirmId(board.id)}
                      aria-label={`Delete ${board.title}`}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-trello-danger hover:bg-red-500/15 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
