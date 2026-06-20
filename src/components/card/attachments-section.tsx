'use client';

import { useState } from 'react';
import { FileText, Globe, MoreHorizontal, Paperclip, Plus } from 'lucide-react';
import { useBoardStore } from '@/store/use-board-store';
import type { ID } from '@/types';

function detectType(url: string): 'image' | 'link' {
  return /\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i.test(url) ? 'image' : 'link';
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname || url; } catch { return url; }
}

export function AttachmentsSection({
  cardId,
  adding: addingProp,
  onAddingChange,
}: {
  cardId: ID;
  /** Optional controlled open-state for the add form (e.g. the modal sidebar button). */
  adding?: boolean;
  onAddingChange?: (v: boolean) => void;
}) {
  const card               = useBoardStore((s) => s.cards[cardId]);
  const addAttachment      = useBoardStore((s) => s.addAttachment);
  const removeAttachment   = useBoardStore((s) => s.removeAttachment);
  const setCardCoverFromAttachment = useBoardStore((s) => s.setCardCoverFromAttachment);

  const [addingInternal, setAddingInternal] = useState(false);
  const adding = addingProp ?? addingInternal;
  const setAdding = (v: boolean) => { if (onAddingChange) onAddingChange(v); else setAddingInternal(v); };
  const [tab, setTab]           = useState<'url' | 'file'>('url');
  const [url, setUrl]           = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [openMenu, setOpenMenu] = useState<ID | null>(null);

  if (!card) return null;
  const attachments = card.attachments ?? [];
  // Stay hidden until there's something to show OR the add form is open
  // (the modal sidebar's "Attachment" button opens it via the controlled prop).
  if (attachments.length === 0 && !adding) return null;

  function submit() {
    const u = url.trim(); if (!u) return;
    const n = name.trim() || hostnameOf(u);
    const type = detectType(u);
    addAttachment(cardId, { name: n, url: u, type, thumbnail: type === 'image' ? u : undefined, addedBy: 'me' });
    setUrl(''); setName(''); setAdding(false);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('File exceeds the 5MB limit.'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith('image/');
      addAttachment(cardId, {
        name: file.name,
        url: dataUrl,
        type: isImage ? 'image' : 'file',
        thumbnail: isImage ? dataUrl : undefined,
        addedBy: 'me',
      });
      setAdding(false);
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  }

  function extOf(fileName: string): string {
    const m = /\.([a-z0-9]+)$/i.exec(fileName);
    return m ? m[1].toUpperCase() : 'FILE';
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Paperclip className="w-5 h-5 text-trello-textSubtle shrink-0" />
        <span className="font-semibold text-sm text-trello-text flex-1">Attachments</span>
        <button
          onClick={() => setAdding(!adding)}
          className="btn-soft text-xs px-2 py-0.5 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="ml-8 mb-3 bg-trello-surfaceRaised border border-trello-borderSubtle rounded-lg p-3 flex flex-col gap-2">
          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => { setTab('url'); setError(''); }}
              className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${tab === 'url' ? 'bg-trello-primary text-trello-textOnBold' : 'bg-trello-cardHover text-trello-textSubtle hover:text-trello-text'}`}
            >
              Link
            </button>
            <button
              onClick={() => { setTab('file'); setError(''); }}
              className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${tab === 'file' ? 'bg-trello-primary text-trello-textOnBold' : 'bg-trello-cardHover text-trello-textSubtle hover:text-trello-text'}`}
            >
              Upload file
            </button>
          </div>

          {tab === 'url' ? (
            <>
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
            </>
          ) : (
            <>
              <label className="text-xs text-trello-textSubtle">Choose a file (max 5MB)</label>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                onChange={handleFile}
                className="text-xs text-trello-textSecondary file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-trello-primary file:text-trello-textOnBold file:text-xs file:font-medium hover:file:brightness-110 file:cursor-pointer"
              />
              <button onClick={() => { setAdding(false); setError(''); }} className="btn-ghost text-xs px-3 py-1.5 self-start">Cancel</button>
            </>
          )}

          {error && <p className="text-xs text-trello-danger">{error}</p>}
        </div>
      )}

      {/* Attachment list */}
      <div className="ml-8 flex flex-col gap-3">
        {attachments.map((att) => (
          <div key={att.id} className="flex gap-3 items-start group">
            {/* Thumbnail */}
            <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              {att.type === 'image' && att.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary user attachment URLs; next/image domain allowlist would break them
                <img
                  src={att.thumbnail}
                  alt={att.name}
                  loading="lazy"
                  decoding="async"
                  className="h-16 w-28 rounded object-cover bg-trello-cardHover border border-trello-borderSubtle"
                />
              ) : att.type === 'file' ? (
                <div className="h-16 w-28 rounded bg-trello-cardHover border border-trello-borderSubtle flex flex-col items-center justify-center gap-1">
                  <FileText className="w-6 h-6 text-trello-textSubtle" />
                  <span className="text-[10px] font-semibold text-trello-textSubtle">{extOf(att.name)}</span>
                </div>
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
              <p className="text-xs text-trello-textSubtle mt-0.5 truncate">{att.url.startsWith('data:') ? extOf(att.name) : hostnameOf(att.url)}</p>
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
