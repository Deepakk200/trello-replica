'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HelpCircle, Plus, Search } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { boardStore } from '@/store/use-board-store';
import { NotificationBell } from './notification-bell';
import { SearchPalette } from './search-palette';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';

export function TopBar() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') setShortcutsOpen((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data: session } = useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? null;
  const initials = userName
    ? userName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'DC';

  function handleCreateBoard() {
    boardStore.getState().createBoard('New Board', 'linear-gradient(135deg,#0079bf,#5067c5)');
    setCreateOpen(false);
  }
  function handleCreateCard() {
    const s = boardStore.getState();
    const board = s.activeBoardId ? s.boards[s.activeBoardId] : null;
    const firstListId = board?.listIds[0];
    if (firstListId) {
      const cardId = s.createCard(firstListId, 'New card');
      s.setActiveCardModal(cardId);
    }
    setCreateOpen(false);
  }

  const dropdownRow =
    'w-full text-left px-3 py-2 text-sm text-trello-text hover:bg-trello-cardHover transition-colors flex items-center gap-2';

  return (
    <header
      className="h-11 grid grid-cols-[auto_1fr_auto] items-center px-3 gap-3 border-b border-white/[0.08] shrink-0 relative z-30"
      style={{ background: '#1D2125' }}
    >
      <SearchPalette />

      {/* Left: waffle + logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => boardStore.getState().toggleSidebar()}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="0" y="0" width="4" height="4" rx="0.5" /><rect x="6" y="0" width="4" height="4" rx="0.5" /><rect x="12" y="0" width="4" height="4" rx="0.5" />
            <rect x="0" y="6" width="4" height="4" rx="0.5" /><rect x="6" y="6" width="4" height="4" rx="0.5" /><rect x="12" y="6" width="4" height="4" rx="0.5" />
            <rect x="0" y="12" width="4" height="4" rx="0.5" /><rect x="6" y="12" width="4" height="4" rx="0.5" /><rect x="12" y="12" width="4" height="4" rx="0.5" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="6" fill="#0052CC" />
            <rect x="5" y="5" width="8" height="18" rx="2" fill="white" />
            <rect x="15" y="5" width="8" height="11" rx="2" fill="white" />
          </svg>
          <span className="text-white font-semibold text-base leading-none hidden sm:inline">Trello</span>
        </Link>
      </div>

      {/* Center: search pill */}
      <div className="flex justify-center min-w-0">
        <div className="flex items-center gap-2 w-full max-w-[480px] rounded-full px-3 h-8" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Search size={14} className="text-white/50 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/50 outline-none border-transparent"
          />
          <kbd className="hidden sm:inline text-xs text-white/40 border border-white/20 rounded px-1 py-0.5 ml-auto">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>
      </div>

      {/* Right: create · trial · bell · help · avatar */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => { setCreateOpen((v) => !v); setAvatarOpen(false); }}
            className="h-8 px-3 text-sm font-medium text-white rounded-sm flex-shrink-0"
            style={{ background: '#0052CC' }}
          >
            Create
          </button>
          {createOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCreateOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 w-44 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 py-1">
                <button onClick={handleCreateBoard} className={dropdownRow}>
                  <Plus className="w-4 h-4 text-trello-textSubtle" />Create board
                </button>
                <button onClick={handleCreateCard} className={dropdownRow}>
                  <Plus className="w-4 h-4 text-trello-textSubtle" />Create card
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trial badge */}
        <div className="hidden md:flex items-center gap-1.5 bg-purple-600/80 text-white text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0">
          <span>✦</span><span>3 days left</span>
        </div>

        <NotificationBell />

        <button
          onClick={() => setShortcutsOpen(true)}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
          aria-label="Help"
          title="Keyboard shortcuts (?)"
        >
          <HelpCircle size={16} />
        </button>
        <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        {/* Avatar */}
        <div className="relative ml-1">
          <button
            onClick={() => { setAvatarOpen((v) => !v); setCreateOpen(false); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
            style={{ background: '#00B8D9' }}
            aria-label="Account menu"
          >
            {initials}
          </button>
          {avatarOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 w-56 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 py-1">
                {userName && (
                  <div className="px-3 py-2 border-b border-trello-border">
                    <p className="text-sm font-medium text-trello-text truncate">{session?.user?.name ?? 'Account'}</p>
                    {session?.user?.email && (
                      <p className="text-xs text-trello-textSubtle truncate">{session.user.email}</p>
                    )}
                  </div>
                )}
                <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className={`${dropdownRow} text-trello-danger`}>
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
