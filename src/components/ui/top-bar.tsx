'use client';

import { useState } from 'react';
import { Bell, HelpCircle, LayoutGrid, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { boardStore } from '@/store/use-board-store';
import { useThemeStore } from '@/store/use-theme-store';
import { BoardSwitcher } from './board-switcher';

export function TopBar() {
  const theme       = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { unreadCount } = boardStore(
    useShallow((s) => ({ unreadCount: s.notifications.filter((n) => !n.read).length })),
  );
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

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
    <header className="relative z-30 h-11 flex items-center px-3 gap-3 bg-trello-bg/90 backdrop-blur-md border-b border-white/[0.08] shrink-0">

      {/* Left: burger + logo + board switcher */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="md:hidden p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90"
          onClick={() => boardStore.getState().toggleSidebar()}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <LayoutGrid className="w-5 h-5 shrink-0" />
        <span className="font-bold text-base tracking-tight text-white hidden md:inline">Trello Clone</span>
        <BoardSwitcher />
      </div>

      {/* Center: search — dominant element */}
      <div className="flex-1 flex justify-center min-w-0">
        <div className="hidden md:flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            className="w-64 focus:w-96 max-w-[40vw] transition-[width] duration-200 bg-trello-surface/50 h-7 rounded px-2 text-sm outline-none placeholder:text-trello-textSubtle focus:bg-trello-surface"
          />
          <kbd className="hidden lg:inline-flex h-6 items-center rounded-md bg-trello-cardHover px-2 text-[11px] font-medium text-trello-textSubtle opacity-60">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>

        {/* Mobile: icon → expanded input */}
        <div className="md:hidden">
          {searchOpen ? (
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              className="w-[min(280px,calc(100vw-180px))] bg-trello-surface/50 h-8 rounded px-3 text-sm outline-none focus:bg-trello-surface placeholder:text-trello-textSubtle"
              onBlur={() => setSearchOpen(false)}
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Create button + dropdown */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setCreateOpen((v) => !v); setAvatarOpen(false); }}
          className="bg-trello-primary hover:bg-trello-primaryHover text-white h-8 px-2.5 md:px-3 rounded text-sm font-medium flex items-center gap-1.5 transition-colors active:scale-95"
          aria-label="Create"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden md:inline">Create</span>
        </button>
        {createOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setCreateOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 top-full mt-1 w-44 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 py-1">
              <button onClick={handleCreateBoard} className={dropdownRow}>
                <LayoutGrid className="w-4 h-4 text-trello-textSubtle" />Create board
              </button>
              <button onClick={handleCreateCard} className={dropdownRow}>
                <Plus className="w-4 h-4 text-trello-textSubtle" />Create card
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right: theme + bell + help + avatar */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => boardStore.getState().toggleNotificationsDrawer()}
          className="relative p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90"
          aria-label="Open notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-trello-bg" />
          )}
        </button>

        <button
          className="hidden md:flex p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90 text-trello-textSubtle hover:text-trello-text"
          aria-label="Help"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => { setAvatarOpen((v) => !v); setCreateOpen(false); }}
            className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold text-white select-none transition-transform active:scale-90"
            aria-label="Account menu"
          >
            U
          </button>
          {avatarOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 w-48 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl z-50 py-1">
                <button className={dropdownRow}>Profile</button>
                <button onClick={toggleTheme} className={`${dropdownRow} justify-between`}>
                  <span>Theme</span>
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="border-t border-trello-border my-1" />
                <button className={`${dropdownRow} text-trello-danger`}>Log out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
