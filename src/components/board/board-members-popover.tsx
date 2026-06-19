'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { ID } from '@/types';

/** Board-level member popover: shows board members and adds workspace members
 *  to the board via the real `addMemberToBoard` action. */
export function BoardMembersPopover({ boardId, onClose }: { boardId: ID; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const boardMemberIds = useBoardStore((s) => s.boards[boardId]?.memberIds ?? ([] as ID[]));
  const allMembers = useBoardStore((s) => s.members);
  const addMemberToBoard = useBoardStore((s) => s.addMemberToBoard);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const q = search.toLowerCase();
  const onBoard = boardMemberIds.map((id) => allMembers[id]).filter(Boolean);
  const offBoard = Object.values(allMembers).filter((m) => !boardMemberIds.includes(m.id));
  const filt = <T extends { name: string }>(a: T[]) => (q ? a.filter((m) => m.name.toLowerCase().includes(q)) : a);
  const fOn = filt(onBoard);
  const fOff = filt(offBoard);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Board members"
      className="anim-popover-enter origin-top-right absolute right-0 top-full mt-1.5 w-72 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50"
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide">Members</span>
        <button onClick={onClose} aria-label="Close" className="p-0.5 rounded hover:bg-trello-cardHover text-trello-textSubtle transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 bg-trello-cardBg rounded px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-trello-textSubtle shrink-0" />
          <input
            autoFocus
            placeholder="Search members"
            className="flex-1 bg-transparent text-sm outline-none text-trello-text placeholder:text-trello-textSubtle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {fOn.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">On this board</p>
          {fOn.map((m) => (
            <div key={m.id} className="w-full flex items-center gap-2 h-9 px-2 rounded">
              <MemberAvatar memberId={m.id} size="sm" />
              <span className="flex-1 text-sm text-trello-text text-left truncate">{m.name}</span>
              <Check className="w-4 h-4 text-trello-accent shrink-0" />
            </div>
          ))}
        </div>
      )}

      {fOff.length > 0 && (
        <div className={`px-3 pb-3 ${fOn.length > 0 ? 'border-t border-trello-borderSubtle pt-2' : ''}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Add from workspace</p>
          {fOff.map((m) => (
            <button
              key={m.id}
              onClick={() => addMemberToBoard(boardId, m.id)}
              className="w-full flex items-center gap-2 h-9 px-2 rounded hover:bg-trello-cardHover transition-colors"
            >
              <MemberAvatar memberId={m.id} size="sm" />
              <span className="flex-1 text-sm text-trello-text text-left truncate">{m.name}</span>
              <UserPlus className="w-3.5 h-3.5 text-trello-textSubtle shrink-0" />
            </button>
          ))}
        </div>
      )}

      {fOn.length === 0 && fOff.length === 0 && (
        <p className="text-sm text-trello-textSubtle text-center py-4">No members found</p>
      )}
    </div>
  );
}
