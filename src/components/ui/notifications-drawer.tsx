'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Bell, CheckCircle2, Clock, MessageSquare, UserPlus, X, AlertTriangle } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useBoardStore } from '@/store/use-board-store';
import type { ID, Notification } from '@/types';

function timeAgo(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function iconFor(notification: Notification) {
  switch (notification.type) {
    case 'due_soon': return <Clock className="h-4 w-4 text-amber-400" />;
    case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-400" />;
    case 'assigned': return <UserPlus className="h-4 w-4 text-emerald-400" />;
    case 'commented': return <MessageSquare className="h-4 w-4 text-sky-400" />;
    case 'moved': return <ArrowRight className="h-4 w-4 text-violet-400" />;
    case 'mention':
    default:
      return <Bell className="h-4 w-4 text-trello-accent" />;
  }
}

export function NotificationsDrawer() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const { open, notifications, boards, cards, lists } = useBoardStore(
    useShallow((s) => ({
      open: s.notificationsOpen,
      notifications: s.notifications,
      boards: s.boards,
      cards: s.cards,
      lists: s.lists,
    })),
  );
  const closeDrawer = useBoardStore((s) => s.closeNotificationsDrawer);
  const markNotificationRead = useBoardStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useBoardStore((s) => s.markAllNotificationsRead);
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const setActiveCardModal = useBoardStore((s) => s.setActiveCardModal);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const visibleNotifications = useMemo(() => {
    return (tab === 'all' ? notifications : notifications.filter((notification) => !notification.read));
  }, [notifications, tab]);

  function openTarget(notification: Notification) {
    if (notification.boardId) setActiveBoard(notification.boardId);
    if (notification.cardId && cards[notification.cardId]) {
      const card = cards[notification.cardId];
      const list = lists[card.listId];
      if (list) setActiveBoard(list.boardId);
      setActiveCardModal(notification.cardId);
    }
    markNotificationRead(notification.id);
    closeDrawer();
  }

  const emptyState = (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
      <p className="text-sm font-medium text-trello-text">You're all caught up</p>
      <p className="text-xs text-trello-textSubtle mt-1">New activity will appear here.</p>
    </div>
  );

  return createPortal(
    <div
      className={`fixed top-10 right-0 z-40 h-[calc(100vh-40px)] w-95 bg-trello-surface border-l border-trello-border transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
    >
      {open && <div className="fixed inset-0 right-95 bg-black/40" onClick={closeDrawer} aria-hidden="true" />}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-trello-border px-4 h-14 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-trello-text">Notifications</h2>
            <button
              onClick={markAllNotificationsRead}
              className="text-[11px] text-trello-textSubtle hover:text-trello-text transition-colors"
            >
              Mark all as read
            </button>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text transition-colors"
            aria-label="Close notifications"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-b border-trello-border shrink-0">
          {(['all', 'unread'] as const).map((value) => {
            const count = value === 'all' ? notifications.length : unreadCount;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tab === value ? 'bg-trello-cardHover text-trello-text' : 'text-trello-textSubtle hover:text-trello-text hover:bg-trello-cardHover/60'}`}
              >
                {value === 'all' ? 'All' : 'Unread'} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {visibleNotifications.length === 0 ? (
            emptyState
          ) : (
            <div className="p-2">
              {visibleNotifications.map((notification) => {
                const unread = !notification.read;
                return (
                  <button
                    key={notification.id}
                    onClick={() => openTarget(notification)}
                    className={`w-full text-left rounded-lg px-3 py-3 flex gap-3 items-start transition-colors ${unread ? 'bg-trello-cardHover/40 hover:bg-trello-cardHover/70' : 'hover:bg-trello-cardHover/50'}`}
                  >
                    <span className="mt-0.5 shrink-0">{iconFor(notification)}</span>
                    <span className={`mt-1 shrink-0 h-2 w-2 rounded-full bg-trello-accent ${unread ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm leading-5 ${unread ? 'font-semibold text-trello-text' : 'text-trello-text'}`}>
                        {notification.text}
                      </span>
                      <span className="block text-xs text-trello-textSubtle mt-1">{timeAgo(notification.createdAt)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}