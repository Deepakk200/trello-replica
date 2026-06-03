"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/features/notifications/actions";
import { useRouter } from "next/navigation";

type Notif = Awaited<ReturnType<typeof getNotifications>>[number];

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const count = await getUnreadNotificationCount();
        if (mounted) setUnread(count);
      } catch { /* ignore (e.g. signed out) */ }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const data = await getNotifications();
        setNotifs(data);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  function handleNotifClick(notif: Notif) {
    const data = notif.data as Record<string, string>;
    handleMarkRead(notif.id);
    setOpen(false);
    if (data.boardId) router.push(`/board/${data.boardId}`);
  }

  return (
    <div className="relative" ref={panelRef}>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {unread > 0 ? `You have ${unread} unread notifications` : ""}
      </div>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
            )}
            {!loading &&
              notifs.map((notif) => {
                const data = notif.data as Record<string, string>;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-accent transition-colors ${notif.read ? "opacity-60" : ""}`}
                  >
                    {!notif.read && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 mb-0.5 align-middle" />
                    )}
                    <p className="text-sm text-foreground leading-snug">{data.message ?? notif.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
