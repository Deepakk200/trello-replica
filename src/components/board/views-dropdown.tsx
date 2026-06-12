'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Calendar, ChevronDown, LayoutGrid, Map, Table2, GanttChart, Lock,
} from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

type View = 'board' | 'calendar' | 'table' | 'dashboard';

const VIEWS: Array<{ id: View; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'board',     label: 'Board',     Icon: LayoutGrid },
  { id: 'table',     label: 'Table',     Icon: Table2 },
  { id: 'calendar',  label: 'Calendar',  Icon: Calendar },
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
];

// Premium-gated views (stubs — show the lock, not yet implemented).
const PREMIUM_VIEWS: Array<{ label: string; Icon: typeof LayoutGrid }> = [
  { label: 'Timeline', Icon: GanttChart },
  { label: 'Map',      Icon: Map },
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
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-1 rounded text-white/80 hover:text-white transition-colors"
        aria-label="Switch board view"
      >
        <CurrentIcon size={16} />
        <span className="text-sm">{current.label}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-60 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-2">
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

          {PREMIUM_VIEWS.map(({ label, Icon }) => (
            <button
              key={label}
              disabled
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left text-white/40 cursor-not-allowed"
              title="Available on Premium"
            >
              <Icon size={15} />
              {label}
              <Lock size={12} className="ml-auto" />
            </button>
          ))}

          <div className="mx-3 mt-2 pt-2 border-t border-white/10">
            <div className="rounded-md bg-gradient-to-r from-[#5E4DB2]/30 to-[#0052CC]/30 border border-white/10 px-3 py-2">
              <p className="text-xs font-semibold text-white mb-0.5">Unlock more views</p>
              <p className="text-[11px] text-white/60 leading-snug">Timeline, Map & more with Trello Premium.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
