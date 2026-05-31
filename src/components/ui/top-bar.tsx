'use client';

import { Bell, Info, LayoutGrid, Menu, Moon, Settings, Sun } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { boardStore } from '@/store/use-board-store';
import { useThemeStore } from '@/store/use-theme-store';
import { BoardSwitcher } from './board-switcher';

export function TopBar() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const { unreadCount } = boardStore(
    useShallow((s) => ({ unreadCount: s.notifications.filter((notification) => !notification.read).length })),
  );

  return (
    <header className="h-10 flex items-center px-3 gap-3 bg-trello-bg/95 backdrop-blur border-b border-trello-borderSubtle">
      <div className="flex items-center gap-2 flex-none">
        <button
          className="md:hidden p-1.5 rounded hover:bg-trello-cardHover transition-colors"
          onClick={() => boardStore.getState().toggleSidebar()}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <LayoutGrid className="w-5 h-5" />
        <span className="font-bold text-sm">Trello Clone</span>
        <BoardSwitcher />
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            className="w-44 focus:w-72 transition-all duration-200 bg-trello-surface/50 h-7 rounded px-2 text-sm outline-none placeholder:text-trello-textSubtle focus:bg-trello-surface"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded-md bg-trello-cardHover px-2 text-[11px] font-medium text-trello-textSubtle opacity-60">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-none">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded hover:bg-trello-cardHover transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          onClick={() => boardStore.getState().toggleNotificationsDrawer()}
          className="relative p-1.5 rounded hover:bg-trello-cardHover transition-colors"
          aria-label="Open notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="absolute -top-1.5 -right-4 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white font-semibold text-center">
                {unreadCount}
              </span>
            </>
          )}
        </button>
        <button className="p-1.5 rounded hover:bg-trello-cardHover transition-colors" title="Board info" aria-label="Board info">
          <Info className="w-4 h-4" />
        </button>
        <button
          title="Reset to seed data"
          onClick={() => boardStore.getState().clearAll()}
          className="p-1.5 rounded hover:bg-trello-cardHover transition-colors text-trello-textSubtle hover:text-trello-text"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold select-none ml-1">
          U
        </div>
      </div>
    </header>
  );
}
