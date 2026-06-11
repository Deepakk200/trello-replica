'use client';

import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { ResizeDivider } from './resize-divider';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { InboxPanel } from '@/components/ui/inbox-panel';
import { SwitchBoardsPanel } from '@/components/ui/switch-boards-panel';
import { PlannerView } from '@/components/board/planner-view';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { inboxOpen, plannerOpen, inboxWidth, plannerWidth } = useBoardStore(
    useShallow((s) => ({
      inboxOpen: s.inboxOpen,
      plannerOpen: s.plannerOpen,
      inboxWidth: s.inboxWidth,
      plannerWidth: s.plannerWidth,
    })),
  );
  const setInboxWidth = useBoardStore((s) => s.setInboxWidth);
  const setPlannerWidth = useBoardStore((s) => s.setPlannerWidth);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <a
        href="#board-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-200 focus:bg-trello-primary focus:text-trello-textOnBold focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to board content
      </a>

      <TopBar />

      {/* Middle row: sidebar · Inbox · Planner · board canvas — with resizable dividers */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar />

        {inboxOpen && (
          <>
            <div style={{ width: inboxWidth }} className="flex-shrink-0 h-full">
              <InboxPanel />
            </div>
            <ResizeDivider onResize={(dx) => setInboxWidth(inboxWidth + dx)} />
          </>
        )}

        {plannerOpen && (
          <>
            <div style={{ width: plannerWidth }} className="flex-shrink-0 h-full">
              <PlannerView />
            </div>
            <ResizeDivider onResize={(dx) => setPlannerWidth(plannerWidth + dx)} />
          </>
        )}

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
