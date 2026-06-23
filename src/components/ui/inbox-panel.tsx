'use client';

// Inbox panel (DB-canonical). Two real surfaces:
//   1. Capture — a quick-add box that creates a REAL card (createCard) in a
//      chosen board/list, replacing the old localStorage inboxCards.
//   2. Notifications — the user's real DB notifications (same source as the
//      header bell, so the two never diverge), grouped new/earlier, with
//      click-through to /board/[id]?card=<id>.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlignJustify, Lock, AtSign, Clock, MessageSquare, User, Bell, ChevronDown, Filter, MoreHorizontal,
} from 'lucide-react';
import {
  getNotifications, markNotificationRead,
} from '@/features/notifications/actions';
import { createCard, getBoardsForMoveDialog } from '@/features/cards/actions';
import { timeAgo } from '@/lib/time';
import { notify } from '@/store/use-toast-store';

type Notif = Awaited<ReturnType<typeof getNotifications>>[number];
type BoardOpt = Awaited<ReturnType<typeof getBoardsForMoveDialog>>[number];
type Target = { boardId: string; listId: string; boardTitle: string; listTitle: string };

function NotifIcon({ type }: { type: string }) {
  const cls = 'shrink-0 mt-0.5';
  if (type === 'mention') return <AtSign size={15} className={`${cls} text-[#579DFF]`} />;
  if (type.includes('due') || type.includes('overdue')) return <Clock size={15} className={`${cls} text-amber-400`} />;
  if (type.includes('comment')) return <MessageSquare size={15} className={`${cls} text-emerald-400`} />;
  if (type.includes('assign') || type.includes('member')) return <User size={15} className={`${cls} text-purple-400`} />;
  return <Bell size={15} className={`${cls} text-white/50`} />;
}

export function InboxPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const [boards, setBoards] = useState<BoardOpt[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [n, bs] = await Promise.all([getNotifications(), getBoardsForMoveDialog()]);
        if (!mounted) return;
        setNotifs(n);
        setBoards(bs);
        const firstBoard = bs.find((b) => b.lists.length > 0);
        if (firstBoard) {
          const firstList = firstBoard.lists[0];
          setTarget({ boardId: firstBoard.id, listId: firstList.id, boardTitle: firstBoard.title, listTitle: firstList.title });
        }
      } catch { /* signed out / no workspace */ }
      finally { if (mounted) setLoading(false); }
    })();
    setTimeout(() => inputRef.current?.focus(), 150);
    return () => { mounted = false; };
  }, []);

  async function capture(title: string) {
    const t = title.trim();
    if (!t || !target || adding) return;
    setAdding(true);
    try {
      await createCard({ listId: target.listId, title: t });
      if (inputRef.current) inputRef.current.value = '';
      notify.success(`Added to ${target.listTitle}`);
    } catch {
      notify.error("Couldn't add the card");
    } finally {
      setAdding(false);
    }
  }

  async function onNotifClick(n: Notif) {
    const data = n.data as Record<string, string>;
    if (!n.read) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    if (data.boardId) {
      router.push(data.cardId ? `/board/${data.boardId}?card=${data.cardId}` : `/board/${data.boardId}`);
    }
  }

  const unread = notifs.filter((n) => !n.read);
  const earlier = notifs.filter((n) => n.read);
  const shownEarlier = earlier;
  const isEmpty = !loading && notifs.length === 0;

  return (
    <aside aria-label="Inbox" className="flex flex-col h-full w-full" style={{ background: '#1C2B41' }}>
      {/* Header */}
      <div className="flex items-center justify-between h-11 px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <AlignJustify size={16} className="text-white/60" />
          <span className="text-sm font-semibold text-white">Inbox</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button aria-label="Filter" className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white">
            <Filter size={15} />
          </button>
          <button aria-label="Inbox options" className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Capture → real card */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 border border-white/10 focus-within:border-white/30 transition-colors"
          style={{ background: '#253858' }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={target ? 'Add a card' : 'Create a board first'}
            disabled={!target}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none disabled:cursor-not-allowed"
            onKeyDown={(e) => { if (e.key === 'Enter') capture(e.currentTarget.value); }}
          />
        </div>
        {target && (
          <div className="relative mt-1.5">
            <button
              onClick={() => setTargetOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={targetOpen}
              className="flex items-center gap-1 text-xs text-white/50 hover:text-white"
            >
              → {target.listTitle} in {target.boardTitle} <ChevronDown size={12} />
            </button>
            {targetOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTargetOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-full mt-1 z-50 w-56 max-h-64 overflow-y-auto bg-[#282E33] border border-white/10 rounded-lg shadow-2xl py-1" role="menu">
                  {boards.filter((b) => b.lists.length > 0).map((b) => (
                    <div key={b.id}>
                      <p className="px-3 pt-1.5 pb-0.5 text-[11px] uppercase tracking-wide text-white/40 truncate">{b.title}</p>
                      {b.lists.map((l) => (
                        <button
                          key={l.id}
                          role="menuitem"
                          onClick={() => { setTarget({ boardId: b.id, listId: l.id, boardTitle: b.title, listTitle: l.title }); setTargetOpen(false); }}
                          className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 truncate ${target.listId === l.id ? 'text-[#579DFF]' : 'text-white/80'}`}
                        >
                          {l.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Notifications feed */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading && <p className="px-2 py-6 text-center text-sm text-white/50">Loading…</p>}

        {isEmpty && (
          <div className="flex flex-col items-center text-center gap-6 pt-10 px-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1.5">Consolidate your to-dos</h3>
              <p className="text-sm text-white/60 max-w-[280px] mx-auto leading-relaxed">Email it, say it, forward it — however it comes, get it into Trello fast.</p>
            </div>
            {/* Scattered source-icon cluster (email · chrome · mobile · slack · teams) */}
            <div className="relative h-28 w-full max-w-[260px]">
              {/* Email — blue envelope */}
              <div className="absolute left-2 top-3 w-11 h-11 rounded-full bg-[#0C66E4] flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" fill="white" /><path d="M4 7l8 6 8-6" stroke="#0C66E4" strokeWidth="1.5" fill="none" /></svg>
              </div>
              {/* Chrome */}
              <div className="absolute right-6 top-0 w-10 h-10 rounded-full bg-[#22272B] flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff" /><circle cx="12" cy="12" r="4" fill="#4285F4" /><path d="M12 8h8" stroke="#EA4335" strokeWidth="2" /><path d="M8 14L4 7" stroke="#34A853" strokeWidth="2" /><path d="M16 14l-4 7" stroke="#FBBC05" strokeWidth="2" /></svg>
              </div>
              {/* Mobile — emphasized yellow ring */}
              <div className="absolute left-1/2 -translate-x-1/2 top-8 w-14 h-14 rounded-full bg-[#22272B] border-2 border-[#F5CD47] flex items-center justify-center shadow-xl">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="7" y="3" width="10" height="18" rx="2" stroke="#F5CD47" strokeWidth="1.5" /><circle cx="12" cy="18" r="1" fill="#F5CD47" /></svg>
              </div>
              {/* Slack */}
              <div className="absolute left-5 bottom-0 w-10 h-10 rounded-full bg-[#22272B] flex items-center justify-center shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#fff" /><text x="12" y="16" textAnchor="middle" fontSize="11" fill="#4A154B" fontWeight="bold">#</text></svg>
              </div>
              {/* Microsoft Teams — purple */}
              <div className="absolute right-3 bottom-2 w-11 h-11 rounded-full bg-[#5059C9] flex items-center justify-center shadow-lg text-white font-bold text-sm">T</div>
            </div>
          </div>
        )}

        {unread.length > 0 && (
          <>
            <p className="px-2 pt-1 pb-1 text-[11px] uppercase tracking-wide text-white/40">New</p>
            <div className="flex flex-col gap-1">
              {unread.map((n) => <NotifRow key={n.id} n={n} onClick={() => onNotifClick(n)} />)}
            </div>
          </>
        )}

        {shownEarlier.length > 0 && (
          <>
            <p className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-white/40">Earlier</p>
            <div className="flex flex-col gap-1">
              {shownEarlier.map((n) => <NotifRow key={n.id} n={n} onClick={() => onNotifClick(n)} />)}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
        <Lock size={12} className="text-white/40 flex-shrink-0" />
        <span className="text-xs text-white/40">Inbox is only visible to you</span>
      </div>
    </aside>
  );
}

function NotifRow({ n, onClick }: { n: Notif; onClick: () => void }) {
  const data = n.data as Record<string, string>;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-2.5 rounded-lg px-3 py-2.5 border border-white/10 hover:border-white/25 transition-colors ${n.read ? 'bg-[#22272B]/60 opacity-70' : 'bg-[#22272B]'}`}
    >
      <NotifIcon type={n.type} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white leading-snug break-words">{data.message ?? n.type}</p>
        <p className="text-xs text-white/40 mt-0.5">
          {data.boardTitle ? `${data.boardTitle} · ` : ''}{timeAgo(new Date(n.createdAt).toISOString())}
        </p>
      </div>
      {!n.read && <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#579DFF]" />}
    </button>
  );
}
