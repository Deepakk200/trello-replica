'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';
import { timeAgo } from '@/lib/time';

export function ActivitySection({ cardId }: { cardId: ID }) {
  const card         = useBoardStore((s) => s.cards[cardId]);
  const pushActivity = useBoardStore((s) => s.pushActivity);
  const updateComment = useBoardStore((s) => s.updateComment);
  const deleteComment = useBoardStore((s) => s.deleteComment);
  const [comment, setComment]       = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [editingId, setEditingId]   = useState<ID | null>(null);
  const [editDraft, setEditDraft]   = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<ID | null>(null);

  if (!card) return null;

  function submitComment() {
    const t = comment.trim();
    if (!t) return;
    pushActivity(cardId, { type: 'commented', text: t });
    setComment('');
  }

  function startEditComment(id: ID, text: string) {
    setConfirmDeleteId(null);
    setEditingId(id);
    setEditDraft(text);
  }

  function saveEditComment() {
    const t = editDraft.trim();
    if (editingId && t) updateComment(cardId, editingId, t);
    setEditingId(null);
    setEditDraft('');
  }

  const feed = [...card.activity]
    .reverse()
    .filter((a) => showDetails || a.type === 'commented');

  return (
    <div className="flex gap-3">
      <MessageSquare className="w-5 h-5 mt-0.5 text-trello-textSubtle shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle">
            Activity
          </p>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-trello-textSubtle hover:text-trello-text hover:bg-trello-cardHover px-2 py-1 rounded transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        {/* Comment composer */}
        <div className="flex gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold text-white shrink-0 select-none">
            U
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              rows={2}
              className="w-full bg-trello-cardBg text-trello-text rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-trello-accent placeholder:text-trello-textSubtle"
              placeholder="Write a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
              }}
            />
            {comment.trim() && (
              <button
                onClick={submitComment}
                className="self-start btn-primary text-sm font-medium px-3 py-1.5"
              >
                Save
              </button>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="flex flex-col gap-3">
          {feed.map((entry) => (
            <div key={entry.id} className="flex gap-2 group">
              <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-400 to-orange-400 flex items-center justify-center text-xs font-bold text-white shrink-0 select-none">
                U
              </div>
              <div className="flex-1 min-w-0">
                {entry.type === 'commented' ? (
                  editingId === entry.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        autoFocus
                        rows={2}
                        className="w-full bg-trello-cardBg text-trello-text rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-trello-accent"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditComment(); }
                          if (e.key === 'Escape') { setEditingId(null); setEditDraft(''); }
                        }}
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditComment} className="btn-primary text-sm font-medium px-3 py-1.5">Save</button>
                        <button onClick={() => { setEditingId(null); setEditDraft(''); }} className="btn-ghost text-sm px-3 py-1.5">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-trello-cardBg rounded-lg px-3 py-2 text-sm text-trello-text break-words">
                        {entry.text}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-trello-textSubtle">{timeAgo(entry.createdAt)}</p>
                        {confirmDeleteId === entry.id ? (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-trello-textSubtle">Delete?</span>
                            <button onClick={() => { deleteComment(cardId, entry.id); setConfirmDeleteId(null); }} className="text-trello-danger hover:underline">Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-trello-textSubtle hover:underline">No</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-xs text-trello-textSubtle opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditComment(entry.id, entry.text)} className="hover:underline hover:text-trello-text">Edit</button>
                            <span>·</span>
                            <button onClick={() => setConfirmDeleteId(entry.id)} className="hover:underline hover:text-trello-text">Delete</button>
                          </span>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <p className="text-sm text-trello-text break-words">{entry.text}</p>
                    <p className="text-xs text-trello-textSubtle mt-0.5">{timeAgo(entry.createdAt)}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
