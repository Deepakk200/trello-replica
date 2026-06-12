'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Check, ChevronLeft, ChevronRight, ExternalLink, Monitor, Moon, Sun, Users,
} from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import { useThemeStore, type Theme } from '@/store/use-theme-store';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Props {
  onClose: () => void;
  onOpenShortcuts: () => void;
  onOpenHelp: () => void;
  onCreateWorkspace: () => void;
}

const sectionLabel = 'text-[11px] uppercase tracking-wider text-white/40 px-3 pt-3 pb-1';
const row =
  'flex items-center gap-3 px-3 py-2 text-sm text-white/85 hover:bg-white/10 cursor-pointer transition-colors w-full text-left';
const divider = 'border-t border-white/[0.08] my-1';

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match browser', Icon: Monitor },
];

export function AccountMenu({ onClose, onOpenShortcuts, onOpenHelp, onCreateWorkspace }: Props) {
  const router = useRouter();
  const [view, setView] = useState<'main' | 'theme' | 'logout'>('main');
  const [notice, setNotice] = useState<string | null>(null);

  const currentUser = useCurrentUser();
  const labsEnabled = useBoardStore((s) => s.labsEnabled);
  const setLabsEnabled = useBoardStore((s) => s.setLabsEnabled);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  // Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(id);
  }, [notice]);

  function go(path: string) {
    onClose();
    router.push(path);
  }

  function toast(msg: string) {
    setNotice(msg);
  }

  const panel = (
    <div
      className={[
        'fixed z-[70] bg-[#282E33] text-white/85 shadow-2xl border border-white/10 overflow-y-auto',
        // Mobile: bottom sheet
        'inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] pb-[env(safe-area-inset-bottom)]',
        // Desktop: anchored top-right
        'sm:inset-x-auto sm:bottom-auto sm:top-12 sm:right-2 sm:w-80 sm:rounded-lg sm:max-h-[calc(100vh-64px)]',
      ].join(' ')}
      role="menu"
      aria-label="Account menu"
    >
      {view === 'main' && (
        <>
          <p className={sectionLabel}>Account</p>
          {/* Account header — real signed-in user */}
          <div className="flex items-start gap-3 px-3 py-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 select-none bg-cover bg-center"
              style={currentUser.image ? { backgroundImage: `url(${currentUser.image})` } : { background: '#00B8D9' }}
            >
              {currentUser.image ? '' : currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-white/50 truncate">{currentUser.email || 'Not signed in'}</p>
            </div>
          </div>
          <button className={row} onClick={() => toast('No other accounts')} role="menuitem">
            Switch accounts
          </button>
          <button className={row} onClick={() => toast('Account management coming soon')} role="menuitem">
            <span className="flex-1">Manage account</span>
            <ExternalLink size={14} className="text-white/40" />
          </button>

          <div className={divider} />

          <p className={sectionLabel}>Trello</p>
          <button className={row} onClick={() => go('/account/profile')} role="menuitem">Profile and visibility</button>
          <button className={row} onClick={() => go('/account/activity')} role="menuitem">Activity</button>
          <button className={row} onClick={() => go('/account/cards')} role="menuitem">Cards</button>
          <button className={row} onClick={() => go('/account/settings')} role="menuitem">Settings</button>
          <button className={row} onClick={() => setLabsEnabled(!labsEnabled)} role="menuitemcheckbox" aria-checked={labsEnabled}>
            <span className="flex-1">Labs</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                labsEnabled ? 'bg-amber-400 text-black' : 'bg-amber-400/20 text-amber-300'
              }`}
            >
              Labs
            </span>
          </button>
          <button className={row} onClick={() => setView('theme')} role="menuitem">
            <span className="flex-1">Theme</span>
            <ChevronRight size={16} className="text-white/40" />
          </button>

          <div className={divider} />

          <button className={row} onClick={() => { onClose(); onCreateWorkspace(); }} role="menuitem">
            <Users size={16} className="text-white/60" />
            Create Workspace
          </button>

          <div className={divider} />

          <button className={row} onClick={() => { onClose(); onOpenHelp(); }} role="menuitem">Help</button>
          <button className={row} onClick={() => { onClose(); onOpenShortcuts(); }} role="menuitem">Shortcuts</button>

          <div className={divider} />

          <button className={row} onClick={() => setView('logout')} role="menuitem">Log out</button>
        </>
      )}

      {view === 'theme' && (
        <div className="py-1">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white w-full hover:bg-white/10 transition-colors"
            onClick={() => setView('main')}
          >
            <ChevronLeft size={16} /> Theme
          </button>
          <div className={divider} />
          {THEME_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              className={row}
              onClick={() => setTheme(value)}
              role="menuitemradio"
              aria-checked={theme === value}
            >
              <Icon size={16} className="text-white/60" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check size={16} className="text-[#579DFF]" />}
            </button>
          ))}
        </div>
      )}

      {view === 'logout' && (
        <div className="p-4">
          <p className="text-sm font-medium text-white mb-1">Log out?</p>
          <p className="text-xs text-white/50 mb-4">You&apos;ll be signed out and returned to the login page.</p>
          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); void signOut({ callbackUrl: '/sign-in' }); }}
              className="flex-1 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: '#0C66E4' }}
            >
              Log out
            </button>
            <button
              onClick={() => setView('main')}
              className="px-3 py-1.5 rounded text-sm text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 sm:bg-transparent" onClick={onClose} aria-hidden="true" />
      {panel}
      {notice && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-lg bg-[#282E33] border border-white/10 text-sm text-white shadow-2xl">
          {notice}
        </div>
      )}
    </>,
    document.body,
  );
}
