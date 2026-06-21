'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { AlignJustify, SlidersHorizontal, MoreHorizontal, Lock, X, ChevronRight,
         Mail, Globe, Smartphone, MessageSquare, Users } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { InboxFilter, EMPTY_INBOX_FILTER, isInboxFilterActive, inboxCardMatches, type InboxFilterState } from '@/components/inbox/inbox-filter';

const INTEGRATIONS = [
  { Icon: Mail,          label: 'Email',  color: '#EA4335', badge: false },
  { Icon: Globe,         label: 'Chrome', color: '#4285F4', badge: true  },
  { Icon: Smartphone,    label: 'Mobile', color: '#34A853', badge: false },
  { Icon: MessageSquare, label: 'Slack',  color: '#4A154B', badge: false },
  { Icon: Users,         label: 'Teams',  color: '#6264A7', badge: false },
];

export function InboxPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<InboxFilterState>(EMPTY_INBOX_FILTER);
  const filterActive = isInboxFilterActive(filter);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const inboxCards = useBoardStore((s) => s.inboxCards);
  const addInboxCard = useBoardStore((s) => s.addInboxCard);
  const deleteInboxCard = useBoardStore((s) => s.deleteInboxCard);
  const moveInboxCardToList = useBoardStore((s) => s.moveInboxCardToList);

  // Lists on the active board, for the "Move to board" dropdown.
  // Select STABLE store records, then derive the mapped array in useMemo —
  // returning freshly-built objects through a selector breaks shallow caching
  // and causes an infinite render loop.
  const activeBoardId = useBoardStore((s) => s.activeBoardId);
  const boards = useBoardStore((s) => s.boards);
  const listsById = useBoardStore((s) => s.lists);
  const lists = useMemo(() => {
    const boardId = activeBoardId ?? Object.keys(boards)[0] ?? null;
    const board = boardId ? boards[boardId] : null;
    if (!board) return [] as { id: string; title: string }[];
    return board.listIds
      .map((lid) => listsById[lid])
      .filter((l): l is NonNullable<typeof l> => !!l && !l.isArchived)
      .map((l) => ({ id: l.id, title: l.title }));
  }, [activeBoardId, boards, listsById]);

  // Apply the inbox filter (AND across sections, OR within each).
  const visibleCards = useMemo(() => inboxCards.filter((c) => inboxCardMatches(c, filter)), [inboxCards, filter]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  return (
    <aside aria-label="Inbox" className="flex flex-col h-full w-full" style={{ background: '#1C2B41' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-11 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <AlignJustify size={16} className="text-white/60" />
          <span className="text-sm font-semibold text-white">Inbox</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              aria-label="Filter"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              className={`relative p-1 rounded hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF] ${filterActive ? 'text-[#579DFF] bg-white/10' : 'text-white/50'}`}
            >
              <SlidersHorizontal size={14} />
              {filterActive && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#579DFF] ring-2 ring-[#1C2B41]" />}
            </button>
            {filterOpen && <InboxFilter filter={filter} onChange={setFilter} onClose={() => setFilterOpen(false)} />}
          </div>
          <div className="relative">
            <button
              onClick={() => setOptionsOpen((v) => !v)}
              aria-label="Inbox options"
              aria-haspopup="menu"
              aria-expanded={optionsOpen}
              className="p-1 rounded hover:bg-white/10 text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF]"
            >
              <MoreHorizontal size={14} />
            </button>
            {optionsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOptionsOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-1" role="menu">
                  <button
                    role="menuitem"
                    disabled={inboxCards.length === 0}
                    onClick={() => { inboxCards.forEach((c) => deleteInboxCard(c.id)); setOptionsOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Clear inbox{inboxCards.length > 0 ? ` (${inboxCards.length})` : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick-add input */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-white/10 hover:border-white/20 focus-within:border-white/30 transition-colors"
          style={{ background: '#253858' }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a card..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                addInboxCard(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>

      {inboxCards.length > 0 ? (
        /* Inbox card list (filtered) */
        <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
          {visibleCards.length === 0 && (
            <div className="flex flex-col items-center text-center gap-2 pt-10">
              <p className="text-sm text-white/60">No cards match your filters.</p>
              <button
                onClick={() => setFilter(EMPTY_INBOX_FILTER)}
                className="text-xs text-[#579DFF] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
          {visibleCards.map((card) => (
            <div key={card.id} className="relative group bg-[#22272B] border border-white/10 rounded-lg px-3 py-2.5">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-white leading-snug break-words">{card.title}</p>
                <button
                  onClick={() => deleteInboxCard(card.id)}
                  className="text-white/30 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Delete inbox card"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-1.5">
                <button
                  onClick={() => setMoveMenuId((id) => (id === card.id ? null : card.id))}
                  disabled={lists.length === 0}
                  className="flex items-center gap-1 text-xs text-white/50 hover:text-white disabled:opacity-40"
                >
                  Move to board <ChevronRight size={12} />
                </button>
                {moveMenuId === card.id && lists.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMoveMenuId(null)} aria-hidden="true" />
                    <div className="absolute left-3 z-50 mt-1 w-48 max-h-56 overflow-y-auto bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-1">
                      {lists.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => { moveInboxCardToList(card.id, l.id); setMoveMenuId(null); }}
                          className="block w-full text-left px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 truncate"
                        >
                          {l.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state with orbit */
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 gap-6">
          <div className="relative w-48 h-48 flex-shrink-0">
            {INTEGRATIONS.map(({ Icon, label, color, badge }, i) => {
              const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
              const x = 96 + 80 * Math.cos(angle) - 22;
              const y = 96 + 80 * Math.sin(angle) - 22;
              return (
                <button
                  key={label}
                  title={label}
                  className="absolute w-11 h-11 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                  style={{ left: x, top: y, background: '#1A2744', border: '1.5px solid rgba(255,255,255,0.15)' }}
                >
                  <Icon size={18} color={color} />
                  {badge && (
                    <span className="absolute -top-1 -right-1 bg-[#0079BF] text-white text-[9px] font-bold rounded-full px-1 leading-4">NEW</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-white mb-2">Consolidate your to-dos</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Email it, say it, forward it — however it comes, get it into Trello fast.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
        <Lock size={12} className="text-white/40 flex-shrink-0" />
        <span className="text-xs text-white/40">Inbox is only visible to you</span>
      </div>
    </aside>
  );
}
