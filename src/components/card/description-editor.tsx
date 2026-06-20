'use client';

import { useMemo, useRef, useState } from 'react';
import { AlignLeft } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

// Dark-themed renderers for Markdown in card descriptions (Tailwind v4 — no
// typography plugin, so styles are applied per element).
const MD_COMPONENTS: Components = {
  h1: ({ ...props }) => <h2 className="text-white font-semibold text-base mb-1" {...props} />,
  h2: ({ ...props }) => <h3 className="text-white font-semibold text-sm mb-1" {...props} />,
  h3: ({ ...props }) => <h4 className="text-white font-semibold text-sm mb-1" {...props} />,
  p:  ({ ...props }) => <p className="text-white/80 mb-2 leading-relaxed text-sm" {...props} />,
  ul: ({ ...props }) => <ul className="text-white/80 pl-4 list-disc mb-2 text-sm" {...props} />,
  ol: ({ ...props }) => <ol className="text-white/80 pl-4 list-decimal mb-2 text-sm" {...props} />,
  code: ({ ...props }) => <code className="bg-white/10 px-1 rounded font-mono text-xs" {...props} />,
  pre: ({ ...props }) => <pre className="bg-white/10 p-3 rounded font-mono text-xs overflow-x-auto mb-2" {...props} />,
  a:  ({ ...props }) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: ({ ...props }) => <blockquote className="border-l-2 border-white/30 pl-3 text-white/60 italic text-sm mb-2" {...props} />,
};

export function DescriptionEditor({ cardId }: { cardId: ID }) {
  const card        = useBoardStore((s) => s.cards[cardId]);
  const updateCard  = useBoardStore((s) => s.updateCard);
  const pushActivity = useBoardStore((s) => s.pushActivity);
  const linkCards   = useBoardStore((s) => s.linkCards);
  const cards       = useBoardStore((s) => s.cards);
  const lists       = useBoardStore((s) => s.lists);
  const boards      = useBoardStore((s) => s.boards);

  const [editing, setEditing]           = useState(false);
  const [draft, setDraft]               = useState('');
  const [mentionState, setMentionState] = useState<{
    query: string; start: number; end: number; index: number;
  } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const mentionResults = useMemo(() => {
    if (!card || !mentionState) return [];
    const query = mentionState.query.toLowerCase();
    return Object.values(cards)
      .filter((c) => c.id !== cardId && !card.linkedCardIds?.includes(c.id))
      .filter((c) => {
        if (!query) return true;
        return c.title.toLowerCase().includes(query) ||
          String(c.number).includes(query.replace(/^#/, ''));
      })
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 8)
      .map((c) => {
        const list  = lists[c.listId];
        const board = list ? boards[list.boardId] : null;
        return { card: c, boardName: board?.title ?? 'Board' };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keys on card?.linkedCardIds (not the whole card) so the list doesn't recompute on unrelated card edits
  }, [boards, card?.linkedCardIds, cardId, cards, lists, mentionState]);

  const activeMention =
    mentionState && mentionResults.length > 0
      ? mentionResults[Math.min(mentionState.index, mentionResults.length - 1)]
      : null;

  // Early return AFTER all hooks (preserves a stable hook order).
  if (!card) return null;

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
    const match  = before.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) { setMentionState(null); return; }
    const fullMatch    = match[0];
    const prefixLength = fullMatch.startsWith(' ') ? 1 : 0;
    const start        = cursor - fullMatch.length + prefixLength;
    setMentionState((current) => ({
      query: match[1] ?? '',
      start,
      end: cursor,
      index: current && current.query === (match[1] ?? '') ? current.index : 0,
    }));
  }

  function insertLinkedCard(number: number, linkedCardId: ID) {
    if (!mentionState) return;
    const insert    = `#${number} `;
    const nextDraft = `${draft.slice(0, mentionState.start)}${insert}${draft.slice(mentionState.end)}`;
    setDraft(nextDraft);
    linkCards(cardId, linkedCardId);
    setMentionState(null);
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const next = mentionState.start + insert.length;
      el.setSelectionRange(next, next);
      autoResize(el);
    }, 0);
  }

  return (
    <div className="flex gap-3">
      <AlignLeft className="w-5 h-5 mt-0.5 text-trello-textSubtle shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
          Description
        </p>

        {editing ? (
          <div className="flex flex-col gap-2 relative">
            <div className="relative">
              <textarea
                ref={ref}
                rows={3}
                className="w-full bg-trello-cardBg text-trello-text rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-trello-accent leading-relaxed placeholder:text-trello-textSubtle"
                placeholder="Add a more detailed description…"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); autoResize(e.target); updateMention(e.target, e.target.value); }}
                onKeyUp={(e) => updateMention(e.currentTarget, e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (!mentionState) {
                    if (e.key === 'Escape') setEditing(false);
                    return;
                  }
                  if (e.key === 'Escape') { e.preventDefault(); setMentionState(null); return; }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionState((cur) => cur ? { ...cur, index: (cur.index + 1) % Math.max(mentionResults.length, 1) } : cur);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionState((cur) => {
                      if (!cur) return cur;
                      const total = Math.max(mentionResults.length, 1);
                      return { ...cur, index: (cur.index - 1 + total) % total };
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
                <div className="absolute left-0 top-full mt-2 w-full max-w-sm bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-30 overflow-hidden">
                  {mentionResults.map(({ card: c, boardName }, index) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 text-sm transition-colors ${index === mentionState.index ? 'bg-trello-cardHover' : 'hover:bg-trello-cardHover/70'}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertLinkedCard(c.number, c.id)}
                    >
                      <span className="min-w-0 truncate text-trello-text">#{c.number} {c.title}</span>
                      <span className="shrink-0 text-xs text-trello-textSubtle truncate max-w-40">{boardName}</span>
                    </button>
                  ))}
                </div>
              )}
              {mentionState && mentionResults.length === 0 && (
                <div className="absolute left-0 top-full mt-2 w-full max-w-sm bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-2xl z-30 px-3 py-2 text-sm text-trello-textSubtle">
                  No matching cards
                </div>
              )}
            </div>
            <p className="text-xs text-white/30">
              **bold** _italic_ `code` - list ## heading [link](url)
            </p>
            <div className="flex gap-2">
              <button
                onClick={save}
                className="btn-primary text-sm font-medium px-3 py-1.5"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn-ghost text-sm px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={startEdit}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(); } }}
            className="w-full text-left text-sm bg-trello-cardBg hover:bg-trello-cardHover text-trello-text rounded-lg px-3 py-2 min-h-14 transition-colors cursor-pointer"
          >
            {card.description ? (
              <ReactMarkdown components={MD_COMPONENTS}>{card.description}</ReactMarkdown>
            ) : (
              <span className="text-trello-textSubtle">Add a more detailed description…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
