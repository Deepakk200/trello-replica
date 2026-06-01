'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Archive, Clock, Image, Maximize2, Pencil, Tag } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function QuickEditPopover({
  cardId,
  isSelected,
  position,
  onClose,
  onOpenModal,
  onToggleSelect,
}: {
  cardId: ID;
  isSelected: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onOpenModal: () => void;
  onToggleSelect: () => void;
}) {
  const archiveCard = useBoardStore((s) => s.archiveCard);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const x  = Math.min(position.x, vw - 208);
  const y  = Math.min(position.y, vh - 260);

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.position = 'fixed';
    ref.current.style.left = `${x}px`;
    ref.current.style.top = `${y}px`;
  }, [x, y]);

  const items = [
    { icon: <Pencil    className="w-4 h-4" />, label: 'Edit title',    action: onOpenModal },
    { icon: <Maximize2 className="w-4 h-4" />, label: 'Open card',     action: onOpenModal },
    { icon: <Tag       className="w-4 h-4" />, label: 'Edit labels',   action: onOpenModal },
    { icon: <Image     className="w-4 h-4" />, label: 'Change cover',  action: onOpenModal },
    { icon: <Clock     className="w-4 h-4" />, label: 'Edit dates',    action: onOpenModal },
    { icon: <Maximize2 className="w-4 h-4" />, label: isSelected ? 'Deselect' : 'Select', action: onToggleSelect },
  ];

  return createPortal(
    <div
      ref={ref}
      className="z-50 w-48 bg-trello-surfaceRaised rounded-lg shadow-xl border border-trello-border p-1"
    >
      {items.map(({ icon, label, action }) => (
        <button
          key={label}
          onClick={() => { action(); onClose(); }}
          className="w-full h-8 px-2 rounded hover:bg-white/10 flex items-center gap-2 text-sm text-slate-200 hover:text-white transition-colors"
        >
          {icon}
          {label}
        </button>
      ))}
      <div className="border-t border-white/10 my-1" />
      <button
        onClick={() => { archiveCard(cardId); onClose(); }}
        className="w-full h-8 px-2 rounded hover:bg-red-500/20 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        <Archive className="w-4 h-4" />
        Archive
      </button>
    </div>,
    document.body,
  );
}
