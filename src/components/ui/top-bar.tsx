'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, HelpCircle, Megaphone, Plus, Search, Users, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { boardStore, useBoardStore, useHasHydrated } from '@/store/use-board-store';
import { useCurrentUser } from '@/hooks/use-current-user';
import { KeyboardShortcutsModal } from './keyboard-shortcuts-modal';
import { AccountMenu } from './account-menu';
import { CreateWorkspaceModal } from './create-workspace-modal';
import { NotificationsDrawer } from './notifications-drawer';

type Menu = 'create' | 'account' | 'announce' | 'help' | null;

export function TopBar() {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const [menu, setMenu] = useState<Menu>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const hydrated = useHasHydrated();

  const { notifications, notificationsOpen } = useBoardStore(
    useShallow((s) => ({
      notifications: s.notifications,
      notificationsOpen: s.notificationsOpen,
    })),
  );
  const toggleNotifications = useBoardStore((s) => s.toggleNotificationsDrawer);
  const closeNotifications = useBoardStore((s) => s.closeNotificationsDrawer);

  const currentUser = useCurrentUser();
  const unread = notifications.filter((n) => !n.read).length;
  const initials = currentUser.initials;

  // Global "?" opens the shortcuts modal (ignore while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') setShortcutsOpen((v) => !v);
      if (e.key === 'Escape') { setMenu(null); setMobileSearchOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Open a top-bar popover, making sure everything else closes (one at a time).
  function openMenu(name: Exclude<Menu, null>) {
    setMenu((cur) => (cur === name ? null : name));
    closeNotifications();
  }
  function openNotifications() {
    setMenu(null);
    toggleNotifications();
  }

  function handleCreateBoard() {
    boardStore.getState().createBoard('New Board', 'linear-gradient(135deg,#0079bf,#5067c5)');
    setMenu(null);
  }
  function handleCreateCard() {
    const s = boardStore.getState();
    const board = s.activeBoardId ? s.boards[s.activeBoardId] : null;
    const firstListId = board?.listIds[0];
    if (firstListId) {
      const cardId = s.createCard(firstListId, 'New card');
      s.setActiveCardModal(cardId);
    }
    setMenu(null);
  }

  const iconBtn = 'p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors';
  const dropdownRow =
    'w-full text-left px-3 py-2 text-sm text-trello-text hover:bg-trello-cardHover transition-colors flex items-center gap-2';
  const popover =
    'absolute right-0 top-full mt-1 bg-[#282E33] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden max-w-[calc(100vw-1rem)]';

  return (
    <header
      className="h-11 grid grid-cols-[auto_1fr_auto] items-center px-3 gap-3 border-b border-white/[0.08] shrink-0 relative z-30"
      style={{ background: '#1D2125' }}
    >
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

      {/* Center: search pill — hidden on mobile (collapses to an icon on the right) */}
      <div className="hidden sm:flex justify-center min-w-0">
        <div className="flex items-center gap-2 w-full max-w-[480px] rounded-full px-3 h-8" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Search size={14} className="text-white/50 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search"
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/50 outline-none border-transparent"
          />
          <kbd className="hidden md:inline text-xs text-white/40 border border-white/20 rounded px-1 py-0.5 ml-auto">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>
      </div>
      {/* Spacer to keep the 3-col grid balanced on mobile */}
      <div className="sm:hidden" />

      {/* Right cluster */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Mobile search icon */}
        <button
          onClick={() => setMobileSearchOpen(true)}
          className={`sm:hidden ${iconBtn}`}
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Create */}
        <div className="relative">
          <button
            onClick={() => openMenu('create')}
            className="h-8 px-3 text-sm font-medium text-white rounded-sm flex-shrink-0"
            style={{ background: '#0052CC' }}
          >
            <span className="hidden sm:inline">Create</span>
            <Plus className="w-4 h-4 sm:hidden" />
          </button>
          {menu === 'create' && (
            <div className={`${popover} w-52`}>
              <button onClick={handleCreateBoard} className={dropdownRow}>
                <Plus className="w-4 h-4 text-trello-textSubtle" />Create board
              </button>
              <button onClick={handleCreateCard} className={dropdownRow}>
                <Plus className="w-4 h-4 text-trello-textSubtle" />Create card
              </button>
              <button onClick={() => { setMenu(null); setCreateWsOpen(true); }} className={dropdownRow}>
                <Users className="w-4 h-4 text-trello-textSubtle" />Create Workspace
              </button>
            </div>
          )}
        </div>

        {/* Trial badge */}
        <div
          className="hidden md:flex items-center gap-1.5 text-white text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg,#8B5CF6,#0C66E4)' }}
        >
          <span>✦</span><span>1 day left</span>
        </div>

        {/* Announcements */}
        <div className="relative hidden sm:block">
          <button onClick={() => openMenu('announce')} className={iconBtn} aria-label="Announcements" title="What's new">
            <Megaphone size={18} />
          </button>
          {menu === 'announce' && (
            <div className={`${popover} w-72`}>
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <p className="text-sm font-semibold text-white">What&apos;s new</p>
              </div>
              <div className="p-2">
                {[
                  { t: 'Workspace home', d: 'Your boards now live on a dedicated home page.' },
                  { t: 'Account menu', d: 'Manage profile, theme and Labs from your avatar.' },
                  { t: 'Calendar view', d: 'Drag cards to reschedule right on the calendar.' },
                ].map((a) => (
                  <div key={a.t} className="px-2 py-2 rounded hover:bg-white/5">
                    <p className="text-sm text-white/90 font-medium">{a.t}</p>
                    <p className="text-xs text-white/50 mt-0.5">{a.d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={openNotifications}
          className={`relative ${iconBtn}`}
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          aria-pressed={notificationsOpen}
        >
          <Bell size={18} />
          {hydrated && unread > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#1D2125]" />
          )}
        </button>

        {/* Help */}
        <div className="relative hidden sm:block">
          <button onClick={() => openMenu('help')} className={iconBtn} aria-label="Help" title="Help">
            <HelpCircle size={18} />
          </button>
          {menu === 'help' && (
            <div className={`${popover} w-56`}>
              <button onClick={() => { setMenu(null); openMenu('announce'); }} className={dropdownRow}>What&apos;s new</button>
              <button onClick={() => { setMenu(null); setShortcutsOpen(true); }} className={dropdownRow}>Keyboard shortcuts</button>
              <a href="https://support.atlassian.com/trello/" target="_blank" rel="noreferrer" className={dropdownRow}>Get help</a>
            </div>
          )}
        </div>

        {/* Avatar — real session user's photo or initials */}
        <button
          onClick={() => openMenu('account')}
          className="ml-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none bg-cover bg-center"
          style={currentUser.image ? { backgroundImage: `url(${currentUser.image})` } : { background: '#00B8D9' }}
          aria-label="Account menu"
          aria-haspopup="menu"
          title={currentUser.name}
        >
          {currentUser.image ? '' : initials}
        </button>
      </div>

      {/* Shared backdrop for the small top-bar popovers */}
      {(menu === 'create' || menu === 'announce' || menu === 'help') && (
        <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} aria-hidden="true" />
      )}

      {/* Account dropdown (own portal + backdrop, bottom-sheet on mobile) */}
      {menu === 'account' && (
        <AccountMenu
          onClose={() => setMenu(null)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenHelp={() => openMenu('help')}
          onCreateWorkspace={() => setCreateWsOpen(true)}
        />
      )}

      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {createWsOpen && <CreateWorkspaceModal onClose={() => setCreateWsOpen(false)} />}
      <NotificationsDrawer />

      {/* Mobile full-width search overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-0 z-50 flex items-center gap-2 px-3 sm:hidden" style={{ background: '#1D2125' }}>
          <div className="flex items-center gap-2 flex-1 rounded-full px-3 h-8" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Search size={14} className="text-white/50 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search"
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/50 outline-none"
            />
          </div>
          <button onClick={() => setMobileSearchOpen(false)} className={iconBtn} aria-label="Close search">
            <X size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
