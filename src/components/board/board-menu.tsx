'use client';

import { useState } from 'react';
import { Activity, Archive, Info, Palette, RotateCcw, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

const PRESET_BACKGROUNDS = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#e67e22)',
  'linear-gradient(135deg,#519839,#70a246)',
  'linear-gradient(135deg,#b04632,#e74c3c)',
  '#1d6fa5',
  '#4a235a',
];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s  = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

export function BoardMenu({ boardId, onClose }: { boardId: ID; onClose: () => void }) {
  const { board, lists, cards } = useBoardStore(
    useShallow((s) => ({ board: s.boards[boardId], lists: s.lists, cards: s.cards })),
  );
  const updateBoardBackground  = useBoardStore((s) => s.updateBoardBackground);
  const updateBoardDescription = useBoardStore((s) => s.updateBoardDescription);
  const restoreCard            = useBoardStore((s) => s.restoreCard);
  const restoreList            = useBoardStore((s) => s.restoreList);

  const [descDraft, setDescDraft]   = useState(board?.description ?? '');
  const [archiveTab, setArchiveTab] = useState<'cards' | 'lists'>('cards');

  if (!board) return null;

  const boardListIds = new Set(
    Object.values(lists).filter((l) => l.boardId === boardId).map((l) => l.id),
  );
  const archivedCards = Object.values(cards).filter(
    (c) => c.isArchived && boardListIds.has(c.listId),
  );
  const archivedLists = Object.values(lists).filter(
    (l) => l.isArchived && l.boardId === boardId,
  );
  const allActivities = Object.values(cards)
    .filter((c) => boardListIds.has(c.listId))
    .flatMap((c) => c.activity.map((a) => ({ ...a, cardTitle: c.title })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} aria-hidden="true" />

      <div className="fixed top-12 md:top-11 right-0 z-40 w-85 h-[calc(100vh-48px)] md:h-[calc(100vh-44px)] bg-trello-surfaceRaised border-l border-trello-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-trello-border shrink-0">
          <h2 className="font-semibold text-sm text-trello-text">Menu</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors"
            aria-label="Close board menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">

          <MenuSection icon={<Info className="w-4 h-4" />} label="About this board">
            <textarea
              rows={3}
              className="w-full bg-trello-cardBg border border-trello-border focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none resize-none placeholder:text-trello-textSubtle transition-colors"
              placeholder="Add a description so visitors know what this board is for"
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
            />
            <button
              onClick={() => updateBoardDescription(boardId, descDraft)}
              className="mt-1.5 btn-primary text-xs font-medium px-3 py-1.5"
            >
              Save
            </button>
          </MenuSection>

          <Divider />

          <MenuSection icon={<Palette className="w-4 h-4" />} label="Change background">
            <div className="grid grid-cols-3 gap-2">
              {PRESET_BACKGROUNDS.map((bg) => (
                <button
                  key={bg}
                  onClick={() => updateBoardBackground(boardId, bg)}
                  style={{ background: bg }}
                  className="h-12 rounded-md border-2 transition-all hover:scale-105 border-transparent hover:border-white/50"
                  aria-label="Change board background"
                />
              ))}
            </div>
          </MenuSection>

          <Divider />

          <MenuSection icon={<Activity className="w-4 h-4" />} label="Activity">
            {allActivities.length === 0 ? (
              <p className="text-xs text-trello-textSubtle italic">No activity yet</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {allActivities.map((a) => (
                  <div key={a.id} className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0 select-none">
                      U
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-trello-textSecondary break-words leading-snug">
                        <span className="font-medium text-trello-text">{a.cardTitle}</span>
                        {' — '}{a.text}
                      </p>
                      <p className="text-[10px] text-trello-textSubtle mt-0.5">{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MenuSection>

          <Divider />

          <MenuSection icon={<Archive className="w-4 h-4" />} label="Archived items">
            <div className="flex gap-1 mb-2">
              <TabBtn active={archiveTab === 'cards'} onClick={() => setArchiveTab('cards')}>Cards</TabBtn>
              <TabBtn active={archiveTab === 'lists'} onClick={() => setArchiveTab('lists')}>Lists</TabBtn>
            </div>

            {archiveTab === 'cards' && (
              archivedCards.length === 0 ? (
                <p className="text-xs text-trello-textSubtle italic">No archived cards</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {archivedCards.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-trello-cardBg rounded px-2 py-1.5 gap-2">
                      <span className="text-sm text-trello-text truncate">{c.title}</span>
                      <button
                        onClick={() => restoreCard(c.id)}
                        className="flex items-center gap-1 text-xs text-trello-accent hover:text-trello-accentHover shrink-0 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Send to board
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {archiveTab === 'lists' && (
              archivedLists.length === 0 ? (
                <p className="text-xs text-trello-textSubtle italic">No archived lists</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {archivedLists.map((l) => (
                    <div key={l.id} className="flex items-center justify-between bg-trello-cardBg rounded px-2 py-1.5 gap-2">
                      <span className="text-sm text-trello-text truncate">{l.title}</span>
                      <button
                        onClick={() => restoreList(l.id)}
                        className="flex items-center gap-1 text-xs text-trello-accent hover:text-trello-accentHover shrink-0 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Send to board
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </MenuSection>
        </div>
      </div>
    </>
  );
}

function MenuSection({ icon, label, children }: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 text-trello-textSubtle mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-trello-border my-2" />;
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
        active
          ? 'bg-trello-primary text-trello-textOnBold'
          : 'bg-trello-cardHover text-trello-textSubtle hover:brightness-110 hover:text-trello-text'
      }`}
    >
      {children}
    </button>
  );
}
