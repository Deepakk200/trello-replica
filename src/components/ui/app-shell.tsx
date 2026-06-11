'use client';

import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { InboxPanel } from '@/components/ui/inbox-panel';
import { SwitchBoardsPanel } from '@/components/ui/switch-boards-panel';
import { PlannerView } from '@/components/board/planner-view';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { inboxOpen, plannerOpen } = useBoardStore(
    useShallow((s) => ({ inboxOpen: s.inboxOpen, plannerOpen: s.plannerOpen })),
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <a
        href="#board-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-200 focus:bg-trello-primary focus:text-trello-textOnBold focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to board content
      </a>

      <TopBar />

      {/* Middle row: sidebar · Inbox panel · Planner panel · board canvas */}
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        {inboxOpen && <InboxPanel />}
        {plannerOpen && <PlannerView />}
        <main id="board-main" className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      <BottomNav />

      {/* Switch-boards is a popup overlay (portal) */}
      <SwitchBoardsPanel />
    </div>
  );
}
