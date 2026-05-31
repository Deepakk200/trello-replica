'use client';

import { useState } from 'react';
import { Globe, MoreHorizontal, Paperclip, Plus, X } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

function detectType(url: string): 'image' | 'link' {
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i.test(url) ? 'image' : 'link';
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname || url; } catch { return url; }
}

export function AttachmentsSection({ cardId }: { cardId: ID }) {
  const card               = useBoardStore((s) => s.cards[cardId]);
  const addAttachment      = useBoardStore((s) => s.addAttachment);
  const removeAttachment   = useBoardStore((s) => s.removeAttachment);
  const setCardCoverFromAttachment = useBoardStore((s) => s.setCardCoverFromAttachment);

  const [adding, setAdding]     = useState(false);
  const [url, setUrl]           = useState('');
  const [name, setName]         = useState('');
  const [openMenu, setOpenMenu] = useState<ID | null>(null);

  if (!card) return null;
  const attachments = card.attachments ?? [];
  if (attachments.length === 0 && !adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="hidden"
        aria-hidden="true"
      />
    );
  }

  function submit() {
    const u = url.trim(); if (!u) return;
    const n = name.trim() || hostnameOf(u);
    const type = detectType(u);
    addAttachment(cardId, { name: n, url: u, type, thumbnail: type === 'image' ? u : undefined, addedBy: 'me' });
    setUrl(''); setName(''); setAdding(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Paperclip className="w-5 h-5 text-trello-textSubtle shrink-0" />
        <span className="font-semibold text-sm text-trello-text flex-1">Attachments</span>
        <button
          onClick={() => setAdding((v) => !v)}
          className="btn-soft text-xs px-2 py-0.5 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="ml-8 mb-3 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg p-3 flex flex-col gap-2">
          <label className="text-xs text-trello-textSubtle">URL</label>
          <input
            autoFocus
            placeholder="Paste a link…"
            className="bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (!name) setName(hostnameOf(e.target.value)); }}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setUrl(''); setName(''); } }}
          />
          <label className="text-xs text-trello-textSubtle">Display name</label>
          <input
            placeholder="Link name"
            className="bg-trello-cardBg border border-trello-borderSubtle focus:border-trello-accent rounded px-2 py-1.5 text-sm text-trello-text outline-none transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setUrl(''); setName(''); } }}
          />
          <div className="flex gap-2">
            <button onClick={submit} className="btn-primary text-xs px-3 py-1.5">Add</button>
            <button onClick={() => { setAdding(false); setUrl(''); setName(''); }} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {/* Attachment list */}
      <div className="ml-8 flex flex-col gap-3">
        {attachments.map((att) => (
          <div key={att.id} className="flex gap-3 items-start group">
            {/* Thumbnail */}
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              {att.type === 'image' && att.thumbnail ? (
                <img
                  src={att.thumbnail}
                  alt={att.name}
                  className="h-16 w-28 rounded object-cover bg-trello-cardHover border border-trello-borderSubtle"
                />
              ) : (
                <div className="h-16 w-28 rounded bg-trello-cardHover border border-trello-borderSubtle flex items-center justify-center">
                  <Globe className="w-6 h-6 text-trello-textSubtle" />
                </div>
              )}
            </a>

            {/* Meta */}
            <div className="flex-1 min-w-0 pt-1">
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-trello-text hover:underline line-clamp-1">
                {att.name}
              </a>
              <p className="text-xs text-trello-textSubtle mt-0.5 truncate">{hostnameOf(att.url)}</p>
            </div>

            {/* Kebab menu */}
            <div className="relative shrink-0 pt-1">
              <button
                onClick={() => setOpenMenu(openMenu === att.id ? null : att.id)}
                title="Attachment actions"
                aria-label="Attachment actions"
                className={`p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle transition-opacity ${openMenu === att.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenu === att.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg shadow-lg z-20 py-1">
                    {att.type === 'image' && (
                      <button
                        onClick={() => { setCardCoverFromAttachment(cardId, att.id); setOpenMenu(null); }}
                        className="w-full text-left px-3 py-1.5 text-sm text-trello-text hover:bg-trello-cardHover transition-colors"
                      >
                        Make cover
                      </button>
                    )}
                    <button
                      onClick={() => { removeAttachment(cardId, att.id); setOpenMenu(null); }}
                      className="w-full text-left px-3 py-1.5 text-sm text-trello-danger hover:bg-trello-cardHover transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Exported control to open the add form from a parent (modal sidebar button)
export function AttachmentsTrigger({ cardId }: { cardId: ID }) {
  const count = useBoardStore((s) => s.cards[cardId]?.attachments?.length ?? 0);
  return <span>{count}</span>;
}

AttachmentsSection.displayName = 'AttachmentsSection';
