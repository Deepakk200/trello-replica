'use client';

import { Bell } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function InboxPanel() {
  const notifications = useBoardStore((s) => s.notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Inbox</h2>
              <p className="text-sm text-white/60">Recent activity and notifications across your boards.</p>
            </div>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-sm text-white/60">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{notification.text}</p>
                    <p className="mt-1 text-xs text-white/50">{formatTime(notification.createdAt)}</p>
                  </div>
                  {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}