'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';

const TIER_LABELS = { free: 'Free', standard: 'Standard', premium: 'Premium', enterprise: 'Enterprise' };

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId } = useBoardStore(
    useShallow((s) => ({ workspaces: s.workspaces, activeWorkspaceId: s.activeWorkspaceId })),
  );
  const setActiveWorkspace = useBoardStore((s) => s.setActiveWorkspace);
  const createWorkspace    = useBoardStore((s) => s.createWorkspace);

  const [open, setOpen]       = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false); }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const active = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const allWorkspaces = Object.values(workspaces);
  if (!active) return null;

  function handleCreate() {
    const n = newName.trim(); if (!n) return;
    const initials = n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    createWorkspace(n, initials, 'linear-gradient(135deg,#667eea,#764ba2)');
    setNewName(''); setCreating(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hover:bg-trello-cardHover rounded p-2 cursor-pointer transition-colors w-full text-left"
      >
        <div
          className="h-8 w-8 rounded flex items-center justify-center text-sm font-bold text-white shrink-0 select-none"
          style={{ background: active.color }}
        >
          {active.shortName.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate text-trello-text">{active.name}</p>
          <p className="text-xs text-trello-textSubtle leading-tight">{TIER_LABELS[active.tier]}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-trello-textSubtle shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-trello-borderSubtle">
            <span className="text-sm font-semibold text-trello-text">Workspaces</span>
            <button onClick={() => setOpen(false)} className="text-trello-textSubtle hover:text-trello-text transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {allWorkspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-trello-cardHover transition-colors"
              >
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: ws.color }}
                >
                  {ws.shortName.slice(0, 2)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-trello-text truncate">{ws.name}</p>
                  <p className="text-xs text-trello-textSubtle">{TIER_LABELS[ws.tier]}</p>
                </div>
                {ws.id === activeWorkspaceId && <Check className="w-4 h-4 text-trello-accent shrink-0" />}
              </button>
            ))}
          </div>

          {creating ? (
            <div className="p-3 border-t border-trello-borderSubtle flex flex-col gap-2">
              <input
                autoFocus
                placeholder="Workspace name"
                className="w-full bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 btn-primary text-xs py-1.5">Create</button>
                <button onClick={() => setCreating(false)} className="px-3 btn-ghost text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-4 py-3 border-t border-trello-borderSubtle hover:bg-trello-cardHover transition-colors text-sm text-trello-textSubtle hover:text-trello-text"
            >
              <Plus className="w-4 h-4" />Create workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
