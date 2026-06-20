'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  CreditCard,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Sparkles,
  Keyboard,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import { useThemeStore } from '@/store/use-theme-store';
import type { ID } from '@/types';

// The palette is mounted globally; load the heavy templates gallery only when the
// "Create board" command is actually run.
const TemplatesGallery = dynamic(
  () => import('@/components/board/templates-gallery').then((m) => m.TemplatesGallery),
  { ssr: false },
);

type RecentItem = { kind: 'board' | 'card'; id: ID };
type PaletteItem = {
  id: string;
  kind: 'board' | 'card' | 'action' | 'recent';
  title: string;
  secondary: string;
  icon: ReactNode;
  onSelect: () => void;
};

function dedupeRecent(items: RecentItem[], next: RecentItem) {
  return [next, ...items.filter((item) => !(item.kind === next.kind && item.id === next.id))].slice(0, 5);
}

function matchesCardNumber(query: string, number: number) {
  const cleaned = query.trim().replace(/^#/, '');
  return cleaned.length > 0 && String(number).includes(cleaned);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const { activeBoardId, activeCardModalId, boards, cards, lists } = useBoardStore(
    useShallow((s) => ({
      activeBoardId: s.activeBoardId,
      activeCardModalId: s.activeCardModalId,
      boards: s.boards,
      cards: s.cards,
      lists: s.lists,
    })),
  );
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const setActiveCardModal = useBoardStore((s) => s.setActiveCardModal);
  const createCard = useBoardStore((s) => s.createCard);
  const toggleNotificationsDrawer = useBoardStore((s) => s.toggleNotificationsDrawer);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const activeBoard = activeBoardId ? boards[activeBoardId] : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !typing) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onCard = activeCardModalId ? cards[activeCardModalId] : null;
    /* eslint-disable react-hooks/set-state-in-effect -- tracks the recently-viewed board/card as they change */
    if (activeBoardId) setRecentItems((items) => dedupeRecent(items, { kind: 'board', id: activeBoardId }));
    if (onCard) setRecentItems((items) => dedupeRecent(items, { kind: 'card', id: onCard.id }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeBoardId, activeCardModalId, cards]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the highlighted row each time the palette opens
    setSelectedIndex(0);
    const timer = setTimeout(() => {
      const input = document.getElementById('command-palette-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items: PaletteItem[] = [];

    const boardItems = Object.values(boards)
      .filter((board) => !board.isArchived && (!normalized || board.title.toLowerCase().includes(normalized)))
      .map((board) => ({
        id: `board:${board.id}`,
        kind: 'board' as const,
        title: board.title,
        secondary: 'Board',
        icon: <LayoutGrid className="h-4 w-4" />,
        onSelect: () => {
          setActiveBoard(board.id);
          setOpen(false);
        },
      }));

    const cardItems = Object.values(cards)
      .filter((card) => !normalized || card.title.toLowerCase().includes(normalized) || matchesCardNumber(normalized, card.number))
      .map((card) => {
        const list = lists[card.listId];
        const board = list ? boards[list.boardId] : null;
        return {
          id: `card:${card.id}`,
          kind: 'card' as const,
          title: `#${card.number} ${card.title}`,
          secondary: `${list?.title ?? 'List'} · Board: ${board?.title ?? 'Unknown'}`,
          icon: <CreditCard className="h-4 w-4" />,
          onSelect: () => {
            if (board) setActiveBoard(board.id);
            setActiveCardModal(card.id);
            setOpen(false);
          },
        };
      });

    const actionItems: PaletteItem[] = [
      {
        id: 'action:create-board',
        kind: 'action',
        title: 'Create board',
        secondary: 'Open templates gallery',
        icon: <Sparkles className="h-4 w-4" />,
        onSelect: () => {
          setShowTemplates(true);
          setOpen(false);
        },
      },
      {
        id: 'action:create-card',
        kind: 'action',
        title: 'Create card in current list',
        secondary: activeBoard?.listIds?.[0] ? `List: ${lists[activeBoard.listIds[0]]?.title ?? 'Current list'}` : 'No list available',
        icon: <Plus className="h-4 w-4" />,
        onSelect: () => {
          const listId = activeBoard?.listIds?.[0];
          if (listId) createCard(listId, 'New card');
          setOpen(false);
        },
      },
      {
        id: 'action:toggle-theme',
        kind: 'action',
        title: 'Toggle theme',
        secondary: 'Switch light / dark mode',
        icon: <Moon className="h-4 w-4" />,
        onSelect: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: 'action:notifications',
        kind: 'action',
        title: 'Open notifications',
        secondary: 'Show the notification drawer',
        icon: <Bell className="h-4 w-4" />,
        onSelect: () => {
          toggleNotificationsDrawer();
          setOpen(false);
        },
      },
      {
        id: 'action:shortcuts',
        kind: 'action',
        title: 'Show shortcuts',
        secondary: 'Open the keyboard shortcuts overlay',
        icon: <Keyboard className="h-4 w-4" />,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
          setOpen(false);
        },
      },
    ];

    if (!normalized) {
      items.push(...recentItems.map((item) => {
        if (item.kind === 'board') {
          const board = boards[item.id];
          if (!board) return null;
          return {
            id: `recent:board:${board.id}`,
            kind: 'recent' as const,
            title: board.title,
            secondary: 'Recently viewed board',
            icon: <LayoutGrid className="h-4 w-4" />,
            onSelect: () => {
              setActiveBoard(board.id);
              setOpen(false);
            },
          };
        }
        const card = cards[item.id];
        if (!card) return null;
        const list = lists[card.listId];
        const board = list ? boards[list.boardId] : null;
        return {
          id: `recent:card:${card.id}`,
          kind: 'recent' as const,
          title: `#${card.number} ${card.title}`,
          secondary: `${list?.title ?? 'List'} · ${board?.title ?? 'Board'}`,
          icon: <CreditCard className="h-4 w-4" />,
          onSelect: () => {
            if (board) setActiveBoard(board.id);
            setActiveCardModal(card.id);
            setOpen(false);
          },
        };
      }).filter(Boolean) as PaletteItem[]);
    } else {
      items.push(...boardItems, ...cardItems, ...actionItems);
    }

    return items.slice(0, normalized ? 40 : 5);
  }, [activeBoard, boards, cards, createCard, lists, query, recentItems, setActiveBoard, setActiveCardModal, toggleNotificationsDrawer, toggleTheme]);

  const groupedItems = useMemo(() => {
    if (query.trim()) {
      return [
        { title: 'Boards', items: visibleItems.filter((item) => item.kind === 'board') },
        { title: 'Cards', items: visibleItems.filter((item) => item.kind === 'card') },
        { title: 'Actions', items: visibleItems.filter((item) => item.kind === 'action') },
      ].filter((group) => group.items.length > 0);
    }

    return [{ title: 'Recently viewed', items: visibleItems }];
  }, [query, visibleItems]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamps the highlighted index when the result count shrinks
    setSelectedIndex((index) => Math.min(index, Math.max(visibleItems.length - 1, 0)));
  }, [visibleItems.length]);

  function activate(index: number) {
    const item = visibleItems[index];
    if (!item) return;
    item.onSelect();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((index) => (visibleItems.length ? (index + 1) % visibleItems.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((index) => (visibleItems.length ? (index - 1 + visibleItems.length) % visibleItems.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      activate(selectedIndex);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open && !showTemplates) return null;

  return createPortal(
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} aria-hidden="true" />}
      {open && (
        <div className="fixed left-1/2 top-[30vh] -translate-x-1/2 w-160 max-w-[95vw] bg-trello-surfaceRaised rounded-xl shadow-2xl border border-trello-border overflow-hidden z-50 text-trello-text">
          <div className="h-14 px-4 border-b border-trello-border flex items-center gap-3">
            <Search className="h-5 w-5 text-trello-textSubtle shrink-0" />
            <input
              id="command-palette-input"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search boards, cards, or run a command…"
              className="flex-1 bg-transparent border-0 outline-none text-lg placeholder:text-trello-textSubtle"
            />
          </div>

          <div className="max-h-100 overflow-y-auto py-2">
            {groupedItems.map((group) => (
              <div key={group.title}>
                <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-trello-textSubtle">
                  {group.title}
                </div>
                <div>
                  {group.items.map((item) => {
                    const index = visibleItems.findIndex((candidate) => candidate.id === item.id);
                    const selected = index === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => item.onSelect()}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${selected ? 'bg-trello-cardHover ring-1 ring-trello-accent' : 'hover:bg-trello-cardHover/70'}`}
                      >
                        <span className="shrink-0 text-trello-textSubtle">{item.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-trello-text">{item.title}</span>
                          <span className="block truncate text-xs text-trello-textSubtle">{item.secondary}</span>
                        </span>
                        <span className="shrink-0 text-xs text-trello-textSubtle text-right max-w-55 truncate">{item.kind}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {groupedItems.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-trello-textSubtle">No matches</div>
            )}
          </div>
        </div>
      )}

      {showTemplates && <TemplatesGallery onClose={() => setShowTemplates(false)} />}
    </>,
    document.body,
  );
}