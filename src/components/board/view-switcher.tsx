'use client';

import { BarChart3, Calendar, LayoutGrid, Table2 } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

type View = 'board' | 'calendar' | 'table' | 'dashboard';

const TABS: Array<{ view: View; label: string; icon: React.ReactNode }> = [
  { view: 'board',     label: 'Board',     icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  { view: 'calendar',  label: 'Calendar',  icon: <Calendar   className="w-3.5 h-3.5" /> },
  { view: 'table',     label: 'Table',     icon: <Table2     className="w-3.5 h-3.5" /> },
  { view: 'dashboard', label: 'Dashboard', icon: <BarChart3  className="w-3.5 h-3.5" /> },
];

export function ViewSwitcher({ boardId }: { boardId: ID }) {
  const activeView  = useBoardStore((s) => s.activeViewByBoard[boardId] ?? 'board');
  const setBoardView = useBoardStore((s) => s.setBoardView);

  return (
    <div className="inline-flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-lg px-1 py-1 mb-3">
      {TABS.map(({ view, label, icon }) => (
        <button
          key={view}
          onClick={() => setBoardView(boardId, view)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeView === view
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
