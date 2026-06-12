'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';

interface Props {
  onClose: () => void;
}

const COLORS = [
  'linear-gradient(135deg,#22A06B,#1A7A4F)',
  'linear-gradient(135deg,#0079bf,#5067c5)',
  'linear-gradient(135deg,#d29034,#e67e22)',
  'linear-gradient(135deg,#b04632,#e2483d)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

function shortNameOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WS';
  return parts.map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function CreateWorkspaceModal({ onClose }: Props) {
  const createWorkspace = useBoardStore((s) => s.createWorkspace);
  const setActiveWorkspace = useBoardStore((s) => s.setActiveWorkspace);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleCreate() {
    const t = name.trim();
    if (!t) return;
    const id = createWorkspace(t, shortNameOf(t), color);
    setActiveWorkspace(id);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Create Workspace"
    >
      <div className="bg-[#282E33] border border-white/10 w-full max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 className="text-sm font-semibold text-white">Create Workspace</h2>
          <button onClick={onClose} aria-label="Close" className="text-white/50 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Workspace name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Taco's Co."
              className="w-full bg-white/10 rounded px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[#579DFF] placeholder:text-white/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: color }}
              >
                {shortNameOf(name || 'WS')}
              </div>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded transition-transform ${color === c ? 'ring-2 ring-white' : 'hover:scale-105'}`}
                    style={{ background: c }}
                    aria-label="Workspace color"
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full py-2 rounded text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#0C66E4' }}
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
