'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Globe, Lock, UserPlus, Users, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { notify } from '@/store/use-toast-store';
import { boardPath } from '@/lib/slug';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { BoardVisibility, ID } from '@/types';

const VISIBILITY: { v: BoardVisibility; label: string; desc: string; Icon: typeof Lock }[] = [
  { v: 'private', label: 'Private', desc: 'Only board members can see this board.', Icon: Lock },
  { v: 'workspace', label: 'Workspace', desc: 'All workspace members can see this board.', Icon: Users },
  { v: 'public', label: 'Public', desc: 'Anyone with the link can see this board.', Icon: Globe },
];

export function ShareDialog({ boardId, onClose }: { boardId: ID; onClose: () => void }) {
  const { board, members } = useBoardStore(
    useShallow((s) => ({ board: s.boards[boardId], members: s.members })),
  );
  const updateBoardVisibility = useBoardStore((s) => s.updateBoardVisibility);
  const addMemberToBoard = useBoardStore((s) => s.addMemberToBoard);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!board || typeof document === 'undefined') return null;

  const path = boardPath(board.id, board.title);
  const link = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

  function copyLink() {
    navigator.clipboard?.writeText(link).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => notify.error("Couldn't copy the link — copy it manually"),
    );
  }

  const boardMembers = board.memberIds.map((id) => members[id]).filter(Boolean);
  const offBoard = Object.values(members).filter((m) => !board.memberIds.includes(m.id));

  return createPortal(
    <>
      <div className="animate-backdrop-enter fixed inset-0 bg-black/60 z-50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share board"
        className="anim-modal-enter fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] max-w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-trello-border shrink-0">
          <h2 className="text-sm font-semibold text-trello-text">Share board</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
          {/* Invite from workspace */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Members</p>
            <div className="flex flex-col gap-1">
              {boardMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2 h-9 px-1">
                  <MemberAvatar memberId={m.id} size="sm" />
                  <span className="flex-1 text-sm text-trello-text truncate">{m.name}</span>
                  <span className="text-xs text-trello-textSubtle">On board</span>
                </div>
              ))}
              {offBoard.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addMemberToBoard(board.id, m.id)}
                  className="flex items-center gap-2 h-9 px-1 rounded hover:bg-trello-cardHover transition-colors text-left"
                >
                  <MemberAvatar memberId={m.id} size="sm" />
                  <span className="flex-1 text-sm text-trello-text truncate">{m.name}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-trello-accent"><UserPlus className="h-3.5 w-3.5" /> Add</span>
                </button>
              ))}
            </div>
          </section>

          {/* Visibility */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Visibility</p>
            <div className="flex flex-col gap-1">
              {VISIBILITY.map(({ v, label, desc, Icon }) => {
                const active = (board.visibility ?? 'workspace') === v;
                return (
                  <button
                    key={v}
                    onClick={() => updateBoardVisibility(board.id, v)}
                    aria-pressed={active}
                    className={`flex items-start gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${active ? 'bg-trello-accent/15 ring-1 ring-trello-accent' : 'hover:bg-trello-cardHover'}`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-trello-textSecondary" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-trello-text">{label}</span>
                      <span className="block text-xs text-trello-textSubtle">{desc}</span>
                    </span>
                    {active && <Check className="h-4 w-4 ml-auto shrink-0 text-trello-accent" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Copy link */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Link to this board</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-trello-cardBg border border-trello-border rounded px-2.5 py-1.5 text-sm text-trello-text outline-none focus:border-trello-accent"
              />
              <button onClick={copyLink} className="btn-primary inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 shrink-0">
                {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}
              </button>
            </div>
          </section>
        </div>
      </div>
    </>,
    document.body,
  );
}
