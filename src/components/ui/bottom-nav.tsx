'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Inbox, Layers, LayoutGrid } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { cn } from '@/lib/utils';

type Panel = 'inbox' | 'planner' | 'board';

function NavTab({ icon, label, active, onClick, shortcut, indicator }: {
  icon: React.ReactNode; label: string; active: boolean;
  onClick: () => void; shortcut?: string; indicator?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-sm font-medium transition-colors',
        active
          ? 'bg-trello-accent/10 text-trello-accent'
          : 'text-trello-textSecondary hover:text-trello-text hover:bg-white/6',
      )}
    >
      {icon}
      <span>{label}</span>
      {shortcut && (
        <span className="hidden lg:inline text-[10px] text-trello-textSubtle bg-white/10 px-1.5 py-0.5 rounded font-mono">{shortcut}</span>
      )}
      {indicator && <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-trello-danger" />}
      {active && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-trello-accent" />}
    </button>
  );
}

export function BottomNav() {
  const { activePanel, boards, activeBoardId, unread } = useBoardStore(
    useShallow((s) => ({
      activePanel: s.activePanel,
      boards: s.boards,
      activeBoardId: s.activeBoardId,
      unread: s.notifications.filter((n) => !n.read).length,
    })),
  );
  const setActivePanel = useBoardStore((s) => s.setActivePanel);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  function boardTileClass(boardId: string) {
    const variants = [
      'bg-gradient-to-br from-sky-500 to-cyan-500',
      'bg-gradient-to-br from-emerald-500 to-teal-500',
      'bg-gradient-to-br from-orange-500 to-amber-500',
      'bg-gradient-to-br from-fuchsia-500 to-pink-500',
    ];
    let hash = 0;
    for (const ch of boardId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return variants[hash % variants.length];
  }

  // 'g' then b/p/i panel shortcuts
  useEffect(() => {
    let gPending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (gPending) {
        const k = e.key.toLowerCase();
        if (k === 'b') setActivePanel('board');
        else if (k === 'p') setActivePanel('planner');
        else if (k === 'i') setActivePanel('inbox');
        gPending = false;
        if (timer) clearTimeout(timer);
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        gPending = true;
        timer = setTimeout(() => { gPending = false; }, 1000);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (timer) clearTimeout(timer); };
  }, [setActivePanel]);

  const pick = (p: Panel) => { setActivePanel(p); setSwitcherOpen(false); };

  return (
    <>
      {switcherOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setSwitcherOpen(false)} aria-hidden="true" />
          <div className="fixed bottom-12 left-0 right-0 z-40 bg-trello-surfaceRaised border-t border-trello-border max-h-75 overflow-y-auto p-4 anim-slide-up pb-safe-lg">
            <h3 className="text-xs font-semibold uppercase text-trello-textSubtle mb-3">Your boards</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.values(boards).map((board) => (
                <button
                  key={board.id}
                  onClick={() => { setActiveBoard(board.id); pick('board'); }}
                  className={cn('h-16 rounded-lg overflow-hidden relative group', activeBoardId === board.id && 'ring-2 ring-trello-accent')}
                >
                  <span className={cn('absolute inset-0 group-hover:opacity-90 transition-opacity', boardTileClass(board.id))} />
                  <span className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <span className="absolute bottom-2 left-2 right-2 text-sm font-semibold text-white text-left truncate">{board.title}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 h-12 bg-trello-surfaceRaised border-t border-trello-border flex items-center justify-center gap-1 px-4 pb-safe">
        <NavTab icon={<Inbox className="h-5 w-5" />} label="Inbox" active={activePanel === 'inbox'} onClick={() => pick('inbox')} indicator={unread > 0} />
        <NavTab icon={<CalendarDays className="h-5 w-5" />} label="Planner" active={activePanel === 'planner'} onClick={() => pick('planner')} shortcut="g p" />
        <NavTab icon={<LayoutGrid className="h-5 w-5" />} label="Board" active={activePanel === 'board'} onClick={() => pick('board')} />
        <NavTab icon={<Layers className="h-5 w-5" />} label="Switch boards" active={switcherOpen} onClick={() => setSwitcherOpen((v) => !v)} />
      </nav>
    </>
  );
}
