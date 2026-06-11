'use client';

import { ArrowLeftRight, CalendarDays, Inbox, LayoutDashboard } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';

type Action = 'inbox' | 'planner' | 'board' | 'switch';

const TABS: { id: string; label: string; Icon: typeof Inbox; action: Action }[] = [
  { id: 'inbox',   label: 'Inbox',         Icon: Inbox,           action: 'inbox' },
  { id: 'planner', label: 'Planner',       Icon: CalendarDays,    action: 'planner' },
  { id: 'board',   label: 'Board',         Icon: LayoutDashboard, action: 'board' },
  { id: 'switch',  label: 'Switch boards', Icon: ArrowLeftRight,  action: 'switch' },
];

export function BottomNav() {
  const { inboxOpen, plannerOpen, switchBoardsOpen } = useBoardStore(
    useShallow((s) => ({
      inboxOpen: s.inboxOpen,
      plannerOpen: s.plannerOpen,
      switchBoardsOpen: s.switchBoardsOpen,
    })),
  );
  const setInboxOpen = useBoardStore((s) => s.setInboxOpen);
  const setPlannerOpen = useBoardStore((s) => s.setPlannerOpen);
  const setSwitchBoardsOpen = useBoardStore((s) => s.setSwitchBoardsOpen);

  function handleTabClick(action: Action) {
    switch (action) {
      case 'inbox':   setInboxOpen(!inboxOpen); break;
      case 'planner': setPlannerOpen(!plannerOpen); break;
      case 'board':   setInboxOpen(false); setPlannerOpen(false); break;
      case 'switch':  setSwitchBoardsOpen(true); break;
    }
  }

  function isActive(action: Action): boolean {
    switch (action) {
      case 'inbox':   return inboxOpen;
      case 'planner': return plannerOpen;
      case 'board':   return !inboxOpen && !plannerOpen;
      case 'switch':  return switchBoardsOpen;
    }
  }

  return (
    <nav
      aria-label="Workspace navigation"
      className="flex items-center h-[52px] border-t border-white/10 shrink-0"
      style={{ background: '#1D2125' }}
    >
      {TABS.map(({ id, label, Icon, action }) => {
        const active = isActive(action);
        return (
          <button
            key={id}
            onClick={() => handleTabClick(action)}
            aria-current={active ? 'page' : undefined}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-xs transition-colors border-t-2 focus-visible:outline-none ${
              active
                ? 'text-white border-[#579DFF]'
                : 'text-white/50 hover:text-white border-transparent'
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
