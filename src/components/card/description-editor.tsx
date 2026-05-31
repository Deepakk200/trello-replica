'use client';

import { useMemo, useRef, useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

export function DescriptionEditor({ cardId }: { cardId: ID }) {
  const card = useBoardStore((s) => s.cards[cardId]);
  const updateCard = useBoardStore((s) => s.updateCard);
  const pushActivity = useBoardStore((s) => s.pushActivity);
  const linkCards = useBoardStore((s) => s.linkCards);
  const cards = useBoardStore((s) => s.cards);
  const lists = useBoardStore((s) => s.lists);
  const boards = useBoardStore((s) => s.boards);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [mentionState, setMentionState] = useState<{ query: string; start: number; end: number; index: number } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  if (!card) return null;

  const mentionResults = useMemo(() => {
    if (!mentionState) return [];
    const query = mentionState.query.toLowerCase();
    return Object.values(cards)
      .filter((candidate) => candidate.id !== cardId && !card.linkedCardIds?.includes(candidate.id))
      .filter((candidate) => {
        if (!query) return true;
        return candidate.title.toLowerCase().includes(query) || String(candidate.number).includes(query.replace(/^#/, ''));
      })
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 8)
      .map((candidate) => {
        const list = lists[candidate.listId];
        const board = list ? boards[list.boardId] : null;
        return { card: candidate, boardName: board?.title ?? 'Board' };
      });
  }, [boards, card.linkedCardIds, cardId, cards, lists, mentionState]);

  const activeMention = mentionState && mentionResults.length > 0 ? mentionResults[Math.min(mentionState.index, mentionResults.length - 1)] : null;

  function startEdit() {
    setDraft(card!.description);
    setMentionState(null);
    setEditing(true);
    setTimeout(() => {
      if (ref.current) { ref.current.focus(); autoResize(ref.current); }
    }, 0);
  }

  function save() {
    updateCard(cardId, { description: draft });
    pushActivity(cardId, { type: 'described', text: 'updated the description' });
    setEditing(false);
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function updateMention(el: HTMLTextAreaElement, value: string) {
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) {
      setMentionState(null);
      return;
    }
    const fullMatch = match[0];
    const prefixLength = fullMatch.startsWith(' ') ? 1 : 0;
    const start = cursor - fullMatch.length + prefixLength;
    setMentionState((current) => ({
      query: match[1] ?? '',
      start,
      end: cursor,
      index: current && current.query === (match[1] ?? '') ? current.index : 0,
    }));
  }

  function insertLinkedCard(number: number, linkedCardId: ID) {
    if (!mentionState) return;
    const insert = `#${number} `;
    const nextDraft = `${draft.slice(0, mentionState.start)}${insert}${draft.slice(mentionState.end)}`;
    setDraft(nextDraft);
    linkCards(cardId, linkedCardId);
    setMentionState(null);
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const nextCursor = mentionState.start + insert.length;
      el.setSelectionRange(nextCursor, nextCursor);
      autoResize(el);
    }, 0);
  }

  return (
    <div className="flex gap-3">
      <AlignLeft className="w-5 h-5 mt-0.5 text-slate-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Description</p>

        {editing ? (
          <div className="flex flex-col gap-2 relative">
            <div className="relative">
              <textarea
                ref={ref}
                rows={3}
                className="w-full bg-[#22272b] text-slate-100 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-sky-500 leading-relaxed placeholder:text-slate-500"
                placeholder="Add a more detailed description…"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); autoResize(e.target); updateMention(e.target, e.target.value); }}
                onKeyUp={(e) => updateMention(e.currentTarget, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (!mentionState) {
                    if (e.key === 'Escape') setEditing(false);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setMentionState(null);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionState((current) => (current ? { ...current, index: (current.index + 1) % Math.max(mentionResults.length, 1) } : current));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionState((current) => {
                      if (!current) return current;
                      const total = Math.max(mentionResults.length, 1);
                      return { ...current, index: (current.index - 1 + total) % total };
                    });
                    return;
                  }
                  if (e.key === 'Enter' && activeMention) {
                    e.preventDefault();
                    insertLinkedCard(activeMention.card.number, activeMention.card.id);
                  }
                }}
              />
              {mentionState && mentionResults.length > 0 && (
                <div className="absolute left-0 top-full mt-2 w-full max-w-105 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-30 overflow-hidden">
                  {mentionResults.map(({ card: candidate, boardName }, index) => (
                    <button
                      key={candidate.id}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 text-sm transition-colors ${index === mentionState.index ? 'bg-trello-cardHover' : 'hover:bg-trello-cardHover/70'}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertLinkedCard(candidate.number, candidate.id)}
                    >
                      <span className="min-w-0 truncate text-trello-text">#{candidate.number} {candidate.title}</span>
                      <span className="shrink-0 text-xs text-trello-textSubtle truncate max-w-40">{boardName}</span>
                    </button>
                  ))}
                </div>
              )}
              {mentionState && mentionResults.length === 0 && (
                <div className="absolute left-0 top-full mt-2 w-full max-w-105 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-30 px-3 py-2 text-sm text-trello-textSubtle">
                  No matching cards
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={save}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-sm rounded font-medium transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-3 py-1.5 hover:bg-white/10 text-slate-300 text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="w-full text-left text-sm bg-white/10 hover:bg-white/15 rounded-lg px-3 py-2 min-h-14 transition-colors"
          >
            {card.description || <span className="text-slate-400">Add a more detailed description…</span>}
          </button>
        )}
      </div>
    </div>
  );
}
