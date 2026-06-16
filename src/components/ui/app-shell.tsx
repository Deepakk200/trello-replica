'use client';

import { TopBar } from './top-bar';
import { BottomNav } from './bottom-nav';
import { ResizeDivider } from './resize-divider';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { InboxPanel } from '@/components/ui/inbox-panel';
import { SwitchBoardsPopup } from '@/components/board/switch-boards-popup';
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

  // Panels stay mounted and animate their width (0 ↔ target) + opacity so they
  // slide/fade in and out. Inner div keeps a fixed width so content doesn't
  // reflow mid-animation; the outer clips it. Disabled under reduced-motion.
  const animWrap = 'h-full flex-shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none';

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1D2125' }}>
      <a
        href="#board-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-200 focus:bg-trello-primary focus:text-trello-textOnBold focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to board content
      </a>

      <TopBar />

      {/* Board shell: Inbox · Planner · board canvas — animated + resizable.
          The workspace sidebar is intentionally NOT rendered here — opening a board
          replaces it with the Inbox panel (Trello's board layout). The sidebar lives
          in the workspace shell (/, /w/*) instead. */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className={animWrap} style={{ width: inboxOpen ? inboxWidth : 0, opacity: inboxOpen ? 1 : 0 }} aria-hidden={!inboxOpen}>
          <div style={{ width: inboxWidth }} className="h-full">
            <InboxPanel />
          </div>
        </div>
        {inboxOpen && <ResizeDivider onResize={(dx) => setInboxWidth(inboxWidth + dx)} />}

        <div className={animWrap} style={{ width: plannerOpen ? plannerWidth : 0, opacity: plannerOpen ? 1 : 0 }} aria-hidden={!plannerOpen}>
          <div style={{ width: plannerWidth }} className="h-full">
            <PlannerView />
          </div>
        </div>
        {plannerOpen && <ResizeDivider onResize={(dx) => setPlannerWidth(plannerWidth + dx)} />}

        <main id="board-main" className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      <BottomNav />

      {/* Switch-boards is a centered modal overlay (portal) */}
      <SwitchBoardsPopup />
    </div>
  );
}
