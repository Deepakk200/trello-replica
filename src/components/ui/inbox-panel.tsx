'use client';

import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlignJustify, MoreHorizontal, Lock, Mail,
         Globe, Smartphone, MessageSquare, Users } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';

// Integration icons shown in the empty-state orbit
const INTEGRATIONS = [
  { icon: Mail,          label: 'Email',  color: '#EA4335' },
  { icon: Globe,         label: 'Chrome', color: '#4285F4' },
  { icon: Smartphone,    label: 'Mobile', color: '#34A853' },
  { icon: MessageSquare, label: 'Slack',  color: '#4A154B' },
  { icon: Users,         label: 'Teams',  color: '#6264A7' },
];

export function InboxPanel() {
  const open     = useBoardStore((s) => s.inboxOpen);
  const setOpen  = useBoardStore((s) => s.setInboxOpen);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the quick-add input when the panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop — click to close */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)} aria-hidden="true" />

      {/* Panel — slide-in from the left */}
      <aside
        className="fixed left-0 top-0 h-full z-40 bg-[#1C2B41] text-white flex flex-col shadow-2xl
                   w-full sm:w-[320px] anim-slide-up duration-200"
        role="complementary"
        aria-label="Inbox"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlignJustify size={16} className="text-white/60" />
            <span className="font-semibold text-sm">Inbox</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    aria-label="Inbox options">
              <MoreHorizontal size={16} />
            </button>
            <button onClick={() => setOpen(false)}
                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    aria-label="Close Inbox">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick-add input */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-white/10 rounded-lg px-3 py-2.5 flex items-center gap-2
                          border border-white/10 hover:border-white/20 focus-within:border-white/30 transition-colors">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a card..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  // Inbox quick-add is a visual stub for now (no inbox list yet).
                  console.log('[inbox] quick-add:', e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 text-center gap-6">
          <div className="relative w-48 h-48 flex-shrink-0">
            <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-xl font-bold text-white/60">📥</span>
            </div>
            {INTEGRATIONS.map((item, i) => {
              const angle = (i / INTEGRATIONS.length) * 2 * Math.PI - Math.PI / 2;
              const r = 72;
              const x = 96 + r * Math.cos(angle) - 20;
              const y = 96 + r * Math.sin(angle) - 20;
              const Icon = item.icon;
              return (
                <button key={item.label} title={item.label}
                  className="absolute w-10 h-10 rounded-full bg-[#1C2B41] border-2 border-white/20 flex items-center justify-center hover:border-white/40 transition-colors cursor-pointer"
                  style={{ left: x, top: y }}>
                  <Icon size={16} color={item.color} />
                  {i === 1 && (
                    <span className="absolute -top-1 -right-1 bg-[#0079BF] text-white text-[9px] font-bold rounded-full px-1 leading-4">NEW</span>
                  )}
                </button>
              );
            })}
          </div>

          <div>
            <h3 className="text-base font-semibold text-white mb-2">Consolidate your to-dos</h3>
            <p className="text-sm text-white/60 leading-relaxed">
              Email it, say it, forward it — however it comes, get it into Trello fast.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
          <Lock size={12} className="text-white/40 flex-shrink-0" />
          <span className="text-xs text-white/40">Inbox is only visible to you</span>
        </div>
      </aside>
    </>,
    document.body,
  );
}
