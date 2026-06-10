'use client';

import { useEffect } from 'react';
import { ArrowLeftRight, CalendarDays, Inbox, LayoutDashboard } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { cn } from '@/lib/utils';

function DockTab({ icon, label, active, onClick, indicator }: {
  icon: React.ReactNode; label: string; active: boolean;
  onClick: () => void; indicator?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={label}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-150 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trello-accent',
        active ? 'text-trello-accent' : 'text-trello-textSecondary hover:text-trello-text hover:bg-white/[0.08]',
      )}
    >
      {icon}
      <span>{label}</span>
      {indicator && <span className="absolute top-0.5 right-2 h-2 w-2 rounded-full bg-trello-danger" />}
      {active && <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-trello-accent" />}
    </button>
  );
}

export function BottomNav() {
  const { activePanel, inboxOpen, switchBoardsOpen, unread } = useBoardStore(
    useShallow((s) => ({
      activePanel: s.activePanel,
      inboxOpen: s.inboxOpen,
      switchBoardsOpen: s.switchBoardsOpen,
      unread: s.notifications.filter((n) => !n.read).length,
    })),
  );
  const setActivePanel = useBoardStore((s) => s.setActivePanel);
  const setInboxOpen = useBoardStore((s) => s.setInboxOpen);
  const setSwitchBoardsOpen = useBoardStore((s) => s.setSwitchBoardsOpen);

  // 'g' then i/p/b panel shortcuts (ignored while typing)
  useEffect(() => {
    let gPending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (gPending) {
        const k = e.key.toLowerCase();
        if (k === 'i') setInboxOpen(true);
        else if (k === 'p') setActivePanel('planner');
        else if (k === 'b') setActivePanel('board');
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
  }, [setActivePanel, setInboxOpen]);

  // Floating dock — mobile/tablet only (hidden on desktop ≥768px).
  return (
    <nav
      aria-label="Workspace navigation"
      className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1.5
                 rounded-2xl bg-trello-surfaceRaised/90 backdrop-blur-md border border-trello-border shadow-2xl pb-safe"
    >
      <DockTab icon={<Inbox className="h-5 w-5" />} label="Inbox" active={inboxOpen} onClick={() => setInboxOpen(true)} indicator={unread > 0} />
      <DockTab icon={<CalendarDays className="h-5 w-5" />} label="Planner" active={activePanel === 'planner'} onClick={() => setActivePanel('planner')} />
      <DockTab icon={<LayoutDashboard className="h-5 w-5" />} label="Board" active={activePanel === 'board' && !inboxOpen} onClick={() => setActivePanel('board')} />
      <DockTab icon={<ArrowLeftRight className="h-5 w-5" />} label="Switch boards" active={switchBoardsOpen} onClick={() => setSwitchBoardsOpen(true)} />
    </nav>
  );
}
