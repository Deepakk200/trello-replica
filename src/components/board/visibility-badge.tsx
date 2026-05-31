'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Lock, Users } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { BoardVisibility, ID } from '@/types';

const CFG: Record<BoardVisibility, { icon: React.ReactNode; label: string; className: string; desc: string }> = {
  private:   { icon: <Lock  className="w-3.5 h-3.5" />, label: 'Private',   className: 'text-trello-warning',     desc: 'Only board members' },
  workspace: { icon: <Users className="w-3.5 h-3.5" />, label: 'Workspace', className: 'text-trello-textSubtle',   desc: 'All workspace members' },
  public:    { icon: <Globe className="w-3.5 h-3.5" />, label: 'Public',    className: 'text-trello-success',      desc: 'Anyone on the internet' },
};

export function VisibilityBadge({ boardId }: { boardId: ID }) {
  const visibility          = useBoardStore((s) => s.boards[boardId]?.visibility ?? 'workspace');
  const updateBoardVisibility = useBoardStore((s) => s.updateBoardVisibility);
  const [open, setOpen]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const cfg = CFG[visibility];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors ${cfg.className}`}
      >
        {cfg.icon}
        <span className="text-white">{cfg.label}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-60 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 py-1">
          <p className="text-xs font-semibold text-trello-textSubtle uppercase tracking-wide px-3 pt-2 pb-1">
            Change visibility
          </p>
          {(Object.entries(CFG) as [BoardVisibility, typeof CFG[BoardVisibility]][]).map(([v, c]) => (
            <button
              key={v}
              onClick={() => { updateBoardVisibility(boardId, v); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-trello-cardHover transition-colors ${visibility === v ? 'bg-trello-cardHover' : ''}`}
            >
              <span className={c.className}>{c.icon}</span>
              <div className="text-left">
                <p className="text-sm font-medium text-trello-text capitalize">{v}</p>
                <p className="text-xs text-trello-textSubtle">{c.desc}</p>
              </div>
              {visibility === v && <span className="ml-auto text-trello-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
