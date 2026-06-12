'use client';

import { Inbox, CalendarDays, LayoutDashboard, ArrowLeftRight } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';

export function BottomNav() {
  const { inboxOpen, plannerOpen } = useBoardStore(
    useShallow((s) => ({ inboxOpen: s.inboxOpen, plannerOpen: s.plannerOpen })),
  );
  const setInboxOpen = useBoardStore((s) => s.setInboxOpen);
  const setPlannerOpen = useBoardStore((s) => s.setPlannerOpen);
  const setSwitchOpen = useBoardStore((s) => s.setSwitchBoardsOpen);

  const boardActive = !inboxOpen && !plannerOpen;

  const tabs = [
    { id: 'inbox',   label: 'Inbox',         Icon: Inbox,           active: inboxOpen,   onClick: () => setInboxOpen(!inboxOpen) },
    { id: 'planner', label: 'Planner',       Icon: CalendarDays,    active: plannerOpen, onClick: () => setPlannerOpen(!plannerOpen) },
    { id: 'board',   label: 'Board',         Icon: LayoutDashboard, active: boardActive, onClick: () => { setInboxOpen(false); setPlannerOpen(false); } },
    { id: 'switch',  label: 'Switch boards', Icon: ArrowLeftRight,  active: false,       onClick: () => setSwitchOpen(true) },
  ];

  return (
    // Centered wrapper — does NOT stretch full width; lets clicks pass through the empty area.
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-sm:left-2 max-sm:right-2 max-sm:translate-x-0">
      <nav
        aria-label="App navigation"
        className="pointer-events-auto flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-xl shadow-2xl border border-white/10 backdrop-blur-md max-sm:w-full"
        style={{ background: 'rgba(31, 33, 37, 0.92)' }}
      >
        {tabs.map(({ id, label, Icon, active, onClick }) => (
          <button
            key={id}
            onClick={onClick}
            aria-current={active ? 'page' : undefined}
            style={{ touchAction: 'manipulation' }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#579DFF] ${
              active ? 'bg-[#1C3D5A] text-[#579DFF]' : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className={id === 'switch' ? 'max-sm:hidden' : undefined}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
