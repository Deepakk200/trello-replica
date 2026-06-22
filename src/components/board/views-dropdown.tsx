'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Calendar, ChevronDown, LayoutGrid, Map, Table2, GanttChart,
} from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { BoardViewKind, ID } from '@/types';

const VIEWS: Array<{ id: BoardViewKind; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'board',     label: 'Board',     Icon: LayoutGrid },
  { id: 'table',     label: 'Table',     Icon: Table2 },
  { id: 'calendar',  label: 'Calendar',  Icon: Calendar },
  { id: 'timeline',  label: 'Timeline',  Icon: GanttChart },
  { id: 'map',       label: 'Map',       Icon: Map },
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
];

export function ViewsDropdown({ boardId }: { boardId: ID }) {
  const activeView = useBoardStore((s) => s.activeViewByBoard[boardId] ?? 'board');
  const setBoardView = useBoardStore((s) => s.setBoardView);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = VIEWS.find((v) => v.id === activeView) ?? VIEWS[0];
  const CurrentIcon = current.Icon;

  return (
    <div ref={ref} className="relative ml-1 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-1 rounded text-white/80 hover:text-white transition-colors"
        aria-label="Switch board view"
      >
        <CurrentIcon size={16} />
        <span className="text-sm hidden sm:inline">{current.label}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="anim-popover-enter absolute left-0 top-full mt-1 z-50 w-60 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-2 origin-top">
          <div className="px-3 pb-2 mb-1 border-b border-white/10">
            <p className="text-xs font-semibold text-white">Views</p>
          </div>

          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setBoardView(boardId, id); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${activeView === id ? 'text-white' : 'text-white/70'}`}
            >
              <Icon size={15} />
              {label}
              {activeView === id && <span className="ml-auto text-[#579DFF]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
