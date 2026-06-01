'use client';

import { useState } from 'react';
import { Bell, LayoutGrid, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
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

  return (
    <header className="h-12 md:h-11 flex items-center px-3 gap-3 bg-trello-bg/95 backdrop-blur-sm border-b border-trello-border shrink-0">

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
        <span className="font-bold text-sm hidden md:inline">Trello Clone</span>
        <BoardSwitcher />
      </div>

      {/* Center: search */}
      <div className="flex-1 flex justify-center min-w-0">
        {/* Desktop: always-visible expanding input */}
        <div className="hidden md:flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            className="w-44 focus:w-72 transition-[width] duration-200 bg-trello-surface/50 h-7 rounded px-2 text-sm outline-none placeholder:text-trello-textSubtle focus:bg-trello-surface"
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
              className="w-[min(280px,calc(100vw-160px))] bg-trello-surface/50 h-8 rounded px-3 text-sm outline-none focus:bg-trello-surface placeholder:text-trello-textSubtle"
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

      {/* Right: theme + bell + settings + avatar */}
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
          title="Reset to seed data"
          onClick={() => boardStore.getState().clearAll()}
          className="p-1.5 rounded hover:bg-trello-cardHover transition-all active:scale-90 text-trello-textSubtle hover:text-trello-text"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold text-white select-none ml-1">
          U
        </div>
      </div>
    </header>
  );
}
