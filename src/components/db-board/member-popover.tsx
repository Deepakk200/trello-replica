'use client';

// Trello member-profile popover, opened from the single account avatar in the
// board header. Shows the signed-in user's avatar, name, and @handle, plus
// profile / activity actions. Closes on X, outside click, and Escape.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';

export function MemberPopover({
  onClose, onEditProfile, onViewActivity,
}: {
  onClose: () => void;
  onEditProfile: () => void;
  onViewActivity: () => void;
}) {
  const user = useCurrentUser();
  const handle = '@' + (user.name || user.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = 'w-full text-left px-4 py-2.5 text-sm text-white/85 hover:bg-white/10 transition-colors';

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Member profile"
        className="fixed z-[70] top-14 right-3 w-[300px] max-w-[92vw] rounded-lg bg-[#282E33] border border-white/10 shadow-2xl overflow-hidden anim-popover-enter"
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-2 top-2 p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 z-10">
          <X size={16} />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0 select-none bg-cover bg-center"
            style={user.image ? { backgroundImage: `url(${user.image})` } : { background: '#00B8D9' }}
            suppressHydrationWarning
          >
            {user.image ? '' : user.initials}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate" suppressHydrationWarning>{user.name}</p>
            <p className="text-xs text-white/50 truncate" suppressHydrationWarning>{handle}</p>
          </div>
        </div>

        <div className="border-t border-white/[0.08]" />
        <button className={row} onClick={onEditProfile}>Edit profile info</button>
        <div className="border-t border-white/[0.08]" />
        <button className={row} onClick={onViewActivity}>View member&apos;s board activity</button>
      </div>
    </>,
    document.body,
  );
}
