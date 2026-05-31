'use client';

import { useState } from 'react';
import { Check, Search, UserPlus, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { MemberAvatar } from '@/components/ui/member-avatar';
import type { ID } from '@/types';

export function MembersPopover({ cardId, onClose }: { cardId: ID; onClose: () => void }) {
  const [search, setSearch] = useState('');

  const { cardMemberIds, boardId, boardMemberIds } = useBoardStore(
    useShallow((s) => {
      const card = s.cards[cardId];
      const list = card ? s.lists[card.listId] : null;
      const board = list ? s.boards[list.boardId] : null;
      return {
        cardMemberIds: card?.memberIds ?? [] as ID[],
        boardId: list?.boardId ?? '',
        boardMemberIds: board?.memberIds ?? [] as ID[],
      };
    }),
  );
  const allMembers    = useBoardStore((s) => s.members);
  const toggleCardMember  = useBoardStore((s) => s.toggleCardMember);
  const addMemberToBoard  = useBoardStore((s) => s.addMemberToBoard);

  const q = search.toLowerCase();
  const boardMembers    = boardMemberIds.map((id) => allMembers[id]).filter(Boolean);
  const nonBoardMembers = Object.values(allMembers).filter((m) => !boardMemberIds.includes(m.id));

  const filtered = <T extends { name: string }>(arr: T[]) =>
    q ? arr.filter((m) => m.name.toLowerCase().includes(q)) : arr;

  const filteredBoard    = filtered(boardMembers);
  const filteredWorkspace = filtered(nonBoardMembers);

  return (
    <div className="absolute right-0 top-full mt-1 w-72 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide">Members</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-trello-cardHover text-trello-textSubtle transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
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

      {/* Board members */}
      {filteredBoard.length > 0 && (
        <div className="px-3 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Board members</p>
          {filteredBoard.map((member) => {
            const assigned = cardMemberIds.includes(member.id);
            return (
              <button
                key={member.id}
                onClick={() => toggleCardMember(cardId, member.id)}
                className="w-full flex items-center gap-2 h-9 px-2 rounded hover:bg-trello-cardHover transition-colors"
              >
                <MemberAvatar memberId={member.id} size="sm" />
                <span className="flex-1 text-sm text-trello-text text-left truncate">{member.name}</span>
                {assigned && <Check className="w-4 h-4 text-trello-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Workspace members (not on board) */}
      {filteredWorkspace.length > 0 && (
        <div className={`px-3 pb-3 ${filteredBoard.length > 0 ? 'border-t border-trello-borderSubtle pt-2' : ''}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle mb-1">Workspace members</p>
          {filteredWorkspace.map((member) => (
            <button
              key={member.id}
              onClick={() => { addMemberToBoard(boardId, member.id); toggleCardMember(cardId, member.id); }}
              className="w-full flex items-center gap-2 h-9 px-2 rounded hover:bg-trello-cardHover transition-colors"
            >
              <MemberAvatar memberId={member.id} size="sm" />
              <span className="flex-1 text-sm text-trello-text text-left truncate">{member.name}</span>
              <UserPlus className="w-3.5 h-3.5 text-trello-textSubtle shrink-0" />
            </button>
          ))}
        </div>
      )}

      {filteredBoard.length === 0 && filteredWorkspace.length === 0 && (
        <p className="text-sm text-trello-textSubtle text-center py-4 pb-4">No members found</p>
      )}
    </div>
  );
}
