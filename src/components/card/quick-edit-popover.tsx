'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArrowRight, Clock, Copy, Image as ImageIcon, Maximize2, Tag, Users } from 'lucide-react';
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
  const card        = useBoardStore((s) => s.cards[cardId]);
  const archiveCard = useBoardStore((s) => s.archiveCard);
  const createCard  = useBoardStore((s) => s.createCard);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth  : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const x  = Math.min(position.x, vw - 212);
  const y  = Math.min(position.y, vh - 300);

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.style.left = `${x}px`;
    ref.current.style.top  = `${y}px`;
  }, [x, y]);

  if (!card) return null;

  function copyCard() {
    createCard(card!.listId, `${card!.title} (copy)`);
    onClose();
  }

  const items = [
    { icon: <Maximize2 className="w-4 h-4" />, label: 'Open card',      action: onOpenModal },
    { icon: <Tag       className="w-4 h-4" />, label: 'Edit labels',    action: onOpenModal },
    { icon: <Users     className="w-4 h-4" />, label: 'Change members', action: onOpenModal },
    { icon: <ImageIcon className="w-4 h-4" />, label: 'Change cover',   action: onOpenModal },
    { icon: <Clock     className="w-4 h-4" />, label: 'Edit dates',     action: onOpenModal },
    { icon: <ArrowRight className="w-4 h-4" />, label: 'Move',          action: onOpenModal },
    { icon: <Copy      className="w-4 h-4" />, label: 'Copy',           action: copyCard },
    {
      icon: <Maximize2 className="w-4 h-4" />,
      label: isSelected ? 'Deselect' : 'Select',
      action: onToggleSelect,
    },
  ];

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 w-52 bg-trello-surfaceRaised rounded-lg shadow-xl border border-trello-border p-1"
    >
      {items.map(({ icon, label, action }) => (
        <button
          key={label}
          onClick={() => { action(); if (label !== 'Copy') onClose(); }}
          className="w-full h-8 px-2 rounded hover:bg-white/10 flex items-center gap-2 text-sm text-trello-textSecondary hover:text-trello-text transition-colors"
        >
          {icon}
          {label}
        </button>
      ))}
      <div className="border-t border-white/10 my-1" />
      <button
        onClick={() => { archiveCard(cardId); onClose(); }}
        className="w-full h-8 px-2 rounded hover:bg-red-500/20 flex items-center gap-2 text-sm text-trello-danger hover:text-red-300 transition-colors"
      >
        <Archive className="w-4 h-4" />
        Archive
      </button>
    </div>,
    document.body,
  );
}
