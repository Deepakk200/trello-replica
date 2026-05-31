'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function ActivitySection({ cardId }: { cardId: ID }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const pushActivity = useBoardStore((s) => s.pushActivity);
  const [comment, setComment] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  if (!card) return null;

  function submitComment() {
    const t = comment.trim();
    if (!t) return;
    pushActivity(cardId, { type: 'commented', text: t });
    setComment('');
  }

  const feed = [...card.activity]
    .reverse()
    .filter((a) => showDetails || a.type === 'commented');

  return (
    <div className="flex gap-3">
      <MessageSquare className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Activity</p>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-white/10 px-2 py-1 rounded transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {/* Comment composer */}
        <div className="flex gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold shrink-0 select-none">
            U
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              rows={2}
              className="w-full bg-[#22272b] text-slate-100 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
            />
            {comment.trim() && (
              <button
                onClick={submitComment}
                className="self-start px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded font-medium transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>

        {/* Feed */}
        <div className="flex flex-col gap-3">
          {feed.map((entry) => (
            <div key={entry.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold shrink-0 select-none">
                U
              </div>
              <div className="flex-1 min-w-0">
                {entry.type === 'commented' ? (
                  <div className="bg-[#22272b] rounded-lg px-3 py-2 text-sm text-slate-200 wrap-break-word">
                    {entry.text}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 wrap-break-word">{entry.text}</p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">{timeAgo(entry.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
