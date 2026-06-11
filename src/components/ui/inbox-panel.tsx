'use client';

import { useRef, useEffect } from 'react';
import { AlignJustify, SlidersHorizontal, MoreHorizontal, Lock,
         Mail, Globe, Smartphone, MessageSquare, Users } from 'lucide-react';

const INTEGRATIONS = [
  { Icon: Mail,          label: 'Email',  color: '#EA4335', badge: false },
  { Icon: Globe,         label: 'Chrome', color: '#4285F4', badge: true  },
  { Icon: Smartphone,    label: 'Mobile', color: '#34A853', badge: false },
  { Icon: MessageSquare, label: 'Slack',  color: '#4A154B', badge: false },
  { Icon: Users,         label: 'Teams',  color: '#6264A7', badge: false },
];

// In-flow Inbox panel (sits between the sidebar and the board, beside Planner).
export function InboxPanel() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  return (
    <aside
      aria-label="Inbox"
      className="flex flex-col h-full shrink-0"
      style={{ background: '#1C2B41', width: 360 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-11 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <AlignJustify size={16} className="text-white/60" />
          <span className="text-sm font-semibold text-white">Inbox</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-white/10 text-white/50" aria-label="Filter">
            <SlidersHorizontal size={14} />
          </button>
          <button className="p-1 rounded hover:bg-white/10 text-white/50" aria-label="Inbox options">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Quick-add input */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-white/10 hover:border-white/20 focus-within:border-white/30 transition-colors"
          style={{ background: '#253858' }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a card..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                console.log('[inbox] quick-add:', e.currentTarget.value.trim());
                e.currentTarget.value = '';
              }
            }}
          />
        </div>
      </div>

      {/* Empty state with orbit (no center icon) */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 gap-6">
        <div className="relative w-48 h-48 flex-shrink-0">
          {INTEGRATIONS.map(({ Icon, label, color, badge }, i) => {
            const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
            const x = 96 + 80 * Math.cos(angle) - 22;
            const y = 96 + 80 * Math.sin(angle) - 22;
            return (
              <button
                key={label}
                title={label}
                className="absolute w-11 h-11 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ left: x, top: y, background: '#1A2744', border: '1.5px solid rgba(255,255,255,0.15)' }}
              >
                <Icon size={18} color={color} />
                {badge && (
                  <span className="absolute -top-1 -right-1 bg-[#0079BF] text-white text-[9px] font-bold rounded-full px-1 leading-4">NEW</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-center">
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
  );
}
