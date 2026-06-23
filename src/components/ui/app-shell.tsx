'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TopBar } from './top-bar';
import { BottomNav } from './bottom-nav';
import { ResizeDivider } from './resize-divider';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { InboxPanel } from '@/components/ui/inbox-panel';
import { SwitchBoardsPopup } from '@/components/board/switch-boards-popup';
import { PlannerView } from '@/components/board/planner-view';
import { BoardUrlSync } from '@/components/ui/board-url-sync';

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
  const setInboxOpen = useBoardStore((s) => s.setInboxOpen);
  const setPlannerOpen = useBoardStore((s) => s.setPlannerOpen);
  const isMobile = useIsMobile();

  // Mobile is board-first. Inbox/Planner default closed everywhere; this guard also
  // force-closes them if the viewport drops to mobile while a panel is open, since at
  // phone width a 360px side panel would crowd the board. They reopen from the dock as
  // full-screen overlays.
  useEffect(() => {
    if (isMobile) {
      setInboxOpen(false);
      setPlannerOpen(false);
    }
  }, [isMobile, setInboxOpen, setPlannerOpen]);

  // Panels stay mounted and animate their width (0 ↔ target) + opacity so they
  // slide/fade in and out. Inner div keeps a fixed width so content doesn't
  // reflow mid-animation; the outer clips it. Disabled under reduced-motion.
  const animWrap = 'h-full flex-shrink-0 overflow-hidden transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-trello-bg">
      {/* Reflects the active board (and renamed-title slug) into the URL. */}
      <BoardUrlSync />

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
        {/* Desktop (md+): inline, resizable side panels beside the board. */}
        {!isMobile && (
          <>
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
          </>
        )}

        <main id="board-main" className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Mobile: Inbox / Planner are full-screen slide-in overlays from the dock,
          so the board always owns the full width of a phone screen. */}
      {isMobile && inboxOpen && (
        <MobilePanelOverlay title="Inbox" onClose={() => setInboxOpen(false)}>
          <InboxPanel />
        </MobilePanelOverlay>
      )}
      {isMobile && plannerOpen && (
        <MobilePanelOverlay title="Planner" onClose={() => setPlannerOpen(false)}>
          <PlannerView />
        </MobilePanelOverlay>
      )}

      <BottomNav />

      {/* Switch-boards is a centered modal overlay (portal) */}
      <SwitchBoardsPopup />
    </div>
  );
}

function MobilePanelOverlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 animate-backdrop-enter" onClick={onClose} aria-hidden="true" />
      <div className="anim-panel-enter-left relative h-full w-[88%] max-w-[420px] flex flex-col shadow-2xl bg-trello-bg">
        <div className="flex items-center justify-between px-3 h-12 border-b border-white/10 shrink-0">
          <span className="text-sm font-semibold text-white">{title}</span>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
