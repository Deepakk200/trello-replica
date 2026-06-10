'use client';

import { TopBar } from './top-bar';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { useBoardStore } from '@/store/use-board-store';
import { InboxPanel } from '@/components/ui/inbox-panel';
import { SwitchBoardsPanel } from '@/components/ui/switch-boards-panel';
import { PlannerView } from '@/components/board/planner-view';
import { PanelUrlSync } from '@/components/ui/panel-url-sync';

export function AppShell({ children }: { children: React.ReactNode }) {
  const activePanel = useBoardStore((s) => s.activePanel);

  return (
    <>
      {/* Keeps Planner / Board in sync with the URL + Back button */}
      <PanelUrlSync />

      <a
        href="#board-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-200 focus:bg-trello-primary focus:text-trello-textOnBold focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to board content
      </a>
      <TopBar />
      <div className="flex h-[calc(100vh-48px)] md:h-[calc(100vh-44px)]">
        <Sidebar />
        <main id="board-main" className="flex-1 overflow-hidden pb-12">
          {/* key forces a remount → panel-enter crossfade on switch */}
          <div key={activePanel} className="panel-enter h-full flex flex-col">
            {activePanel === 'planner' ? <PlannerView /> : children}
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Slide-in overlays — mounted at root so they overlay everything (z-30/40) */}
      <InboxPanel />
      <SwitchBoardsPanel />
    </>
  );
}
