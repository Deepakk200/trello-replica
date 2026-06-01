'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, LayoutGrid, Plus, Settings, Star, Users, Zap } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { WorkspaceSwitcher } from './workspace-switcher';
import { TemplatesGallery } from '@/components/board/templates-gallery';
import type { Board, ID } from '@/types';

const BOARD_GRADIENTS = [
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#e67e22)',
  'linear-gradient(135deg,#519839,#70a246)',
  'linear-gradient(135deg,#b04632,#e74c3c)',
];


function BoardRow({ board, isActive, isStarred, onNavigate, onStar }: {
  board: Board; isActive: boolean; isStarred: boolean;
  onNavigate: () => void; onStar: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onNavigate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate(); } }}
      className={`h-8 px-2 rounded hover:bg-trello-cardHover flex items-center gap-2 cursor-pointer group transition-colors ${isActive ? 'bg-white/10' : ''}`}
    >
      <div
        className="h-5 w-6 rounded-sm shrink-0 bg-trello-cardHover"
        style={{ background: board.background }}
      />
      <span className="flex-1 truncate text-sm text-trello-text">{board.title}</span>
      <button
        onClick={onStar}
        tabIndex={-1}
        aria-label={isStarred ? 'Unstar board' : 'Star board'}
        className={`p-0.5 rounded transition-all hover:bg-trello-cardHover ${
          isStarred
            ? 'opacity-100 text-yellow-400 hover:text-yellow-300'
            : 'opacity-0 group-hover:opacity-100 text-trello-textSubtle hover:text-yellow-400'
        }`}
      >
        <Star className={`h-3.5 w-3.5 ${isStarred ? 'fill-yellow-400' : ''}`} />
      </button>
    </div>
  );
}

export function Sidebar() {
  const { boards, activeBoardId, starredBoardIds, recentBoardIds, sidebarCollapsed, activeWorkspaceId } = useBoardStore(
    useShallow((s) => ({
      boards: s.boards,
      activeBoardId: s.activeBoardId,
      starredBoardIds: s.starredBoardIds ?? [],
      recentBoardIds: s.recentBoardIds ?? [],
      sidebarCollapsed: s.sidebarCollapsed,
      activeWorkspaceId: s.activeWorkspaceId,
    })),
  );
  const setActiveBoard   = useBoardStore((s) => s.setActiveBoard);
  const toggleStarBoard  = useBoardStore((s) => s.toggleStarBoard);
  const toggleSidebar    = useBoardStore((s) => s.toggleSidebar);
  const createBoard      = useBoardStore((s) => s.createBoard);

  const [creating, setCreating]         = useState(false);
  const [newTitle, setNewTitle]         = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Filter boards by active workspace
  const sortedBoards = Object.values(boards)
    .filter((b) => !activeWorkspaceId || b.workspaceId === activeWorkspaceId)
    .sort((a, b) => a.title.localeCompare(b.title));
  const starredBoards = starredBoardIds.map((id: ID) => boards[id]).filter(Boolean) as Board[];
  const recentBoards  = recentBoardIds.map((id: ID) => boards[id]).filter(Boolean) as Board[];

  function submitCreate() {
    const t = newTitle.trim();
    if (t) createBoard(t, BOARD_GRADIENTS[Math.floor(Math.random() * BOARD_GRADIENTS.length)]);
    setNewTitle(''); setCreating(false);
  }

  return (
    <>
      {/* Mobile backdrop */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 top-12 bg-black/40 z-20 md:hidden" onClick={toggleSidebar} aria-hidden="true" />
      )}

      <aside
        className={[
          'fixed top-12 left-0 z-30',
          'md:static md:z-auto md:top-0',
          'h-[calc(100vh-48px)] md:h-full bg-trello-bg border-r border-trello-border',
          'flex flex-col shrink-0 overflow-hidden',
          'transition-all duration-200 ease-in-out',
          sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-5' : 'translate-x-0 w-[280px] md:w-65',
        ].join(' ')}
      >
        {/* Collapse / expand toggle */}
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={[
            'hidden md:flex items-center justify-center shrink-0',
            'text-trello-textSubtle hover:text-trello-text hover:bg-trello-cardHover transition-colors',
            sidebarCollapsed ? 'h-14 w-full' : 'self-end w-7 h-7 rounded m-1.5',
          ].join(' ')}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className={`flex flex-col flex-1 overflow-y-auto min-h-0 ${sidebarCollapsed ? 'hidden' : ''}`}>

          {/* 1. Workspace switcher */}
          <div className="px-3 pt-0 pb-2">
            <WorkspaceSwitcher />
          </div>

          {/* 2. Nav links */}
          <nav className="px-2 mb-1">
            {(
              [
                { icon: <LayoutGrid className="w-4 h-4" />, label: 'Boards',   accent: false },
                { icon: <Users      className="w-4 h-4" />, label: 'Members',  accent: false },
                { icon: <Settings   className="w-4 h-4" />, label: 'Settings', accent: false },
                { icon: <Zap        className="w-4 h-4" />, label: 'Upgrade',  accent: true  },
              ] as { icon: React.ReactNode; label: string; accent: boolean }[]
            ).map(({ icon, label, accent }) => (
              <div
                key={label}
                role="button"
                tabIndex={0}
                className={`h-8 px-3 rounded hover:bg-trello-cardHover flex items-center gap-3 cursor-pointer text-sm transition-colors select-none ${accent ? 'text-yellow-400' : 'text-trello-text'}`}
              >
                {icon}
                {label}
                {accent && (
                  <span className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-medium">Pro</span>
                )}
              </div>
            ))}
          </nav>

          <div className="border-t border-trello-borderSubtle mx-3 my-1" />

          {/* 3. Starred boards */}
          <section className="px-3 mb-2">
            <p className="uppercase text-[11px] text-trello-textSubtle tracking-wider font-semibold px-1 mb-1">Starred boards</p>
            {starredBoards.length === 0 ? (
              <p className="text-xs text-trello-textSubtle px-1 py-0.5 italic">No starred boards yet</p>
            ) : (
              starredBoards.map((b) => (
                <BoardRow
                  key={b.id} board={b} isActive={b.id === activeBoardId} isStarred
                  onNavigate={() => setActiveBoard(b.id)}
                  onStar={(e) => { e.stopPropagation(); toggleStarBoard(b.id); }}
                />
              ))
            )}
          </section>

          {/* 4. Recent boards */}
          {recentBoards.length > 0 && (
            <section className="px-3 mb-2">
              <p className="uppercase text-[11px] text-trello-textSubtle tracking-wider font-semibold px-1 mb-1">Recent</p>
              {recentBoards.map((b) => (
                <BoardRow
                  key={b.id} board={b} isActive={b.id === activeBoardId} isStarred={starredBoardIds.includes(b.id)}
                  onNavigate={() => setActiveBoard(b.id)}
                  onStar={(e) => { e.stopPropagation(); toggleStarBoard(b.id); }}
                />
              ))}
            </section>
          )}

          <div className="border-t border-trello-borderSubtle mx-3 my-1" />

          {/* 5. Your boards (filtered by workspace) */}
          <section className="px-3 pb-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <p className="uppercase text-[11px] text-trello-textSubtle tracking-wider font-semibold">Your boards</p>
              <button
                onClick={() => setCreating((v) => !v)}
                aria-label="Create board"
                className="p-0.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {creating && (
              <div className="mb-2 flex flex-col gap-1.5">
                <input
                  autoFocus
                  placeholder="Board title"
                  className="w-full bg-trello-cardBg border border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none placeholder:text-trello-textSubtle"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')  submitCreate();
                    if (e.key === 'Escape') { setCreating(false); setNewTitle(''); }
                  }}
                />
                <div className="flex gap-1.5">
                  <button onClick={submitCreate} className="flex-1 btn-primary text-xs font-medium py-1.5">Create</button>
                  <button onClick={() => { setCreating(false); setNewTitle(''); }} className="px-2 hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text text-xs rounded transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sortedBoards.map((b) => (
              <BoardRow
                key={b.id} board={b} isActive={b.id === activeBoardId} isStarred={starredBoardIds.includes(b.id)}
                onNavigate={() => setActiveBoard(b.id)}
                onStar={(e) => { e.stopPropagation(); toggleStarBoard(b.id); }}
              />
            ))}
          </section>

          {/* 6. Templates link */}
          <div className="px-2 pb-6">
            <button
              onClick={() => setShowTemplates(true)}
              className="h-8 px-3 rounded hover:bg-trello-cardHover flex items-center gap-3 cursor-pointer text-sm transition-colors select-none text-trello-text w-full"
            >
              <FileText className="w-4 h-4" />
              Templates
            </button>
          </div>
        </div>
      </aside>

      {showTemplates && <TemplatesGallery onClose={() => setShowTemplates(false)} />}
    </>
  );
}
