"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2, Paperclip, FileText, Plus, Trash2 } from "lucide-react";
import { getCardDetails, updateCard, createComment, deleteAttachment, setCardCover, getBoardsForMoveDialog, moveCardToList } from "@/features/cards/actions";
import { createChecklist, deleteChecklist, createChecklistItem, updateChecklistItem, deleteChecklistItem } from "@/features/checklists/actions";
import { getCardActivity } from "@/features/activity/actions";
import { generateCardDescription } from "@/features/ai/actions";
import { UploadButton } from "@/lib/uploadthing";
import { useEventListener } from "@/lib/liveblocks.config";

const COVER_COLORS = ["#E2483D", "#FF9F1A", "#61BD4F", "#0079BF", "#6554C0"];

type CardDetails = NonNullable<Awaited<ReturnType<typeof getCardDetails>>>;
type CardActivity = Awaited<ReturnType<typeof getCardActivity>>[number];

function activityMessage(type: string, data: Record<string, unknown>, who: string): string {
  switch (type) {
    case "card.created": return `${who} created this card`;
    case "card.moved": return `${who} moved this card`;
    case "card.renamed": return `${who} renamed this card to "${String(data.title ?? "")}"`;
    case "label.toggled": return `${who} changed a label`;
    case "due.set": return `${who} set the due date`;
    case "due.cleared": return `${who} removed the due date`;
    case "card.completed": return data.completed ? `${who} marked this card complete` : `${who} marked this card incomplete`;
    case "card.description.changed": return `${who} updated the description`;
    case "comment.added": return `${who} commented`;
    default: return `${who} updated this card`;
  }
}

export function DbCardModal({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const [card, setCard] = useState<CardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [desc, setDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activities, setActivities] = useState<CardActivity[]>([]);

  function refetch() {
    getCardActivity(cardId).then(setActivities).catch(() => {});
    return getCardDetails(cardId).then((data) => {
      setCard(data);
      if (data) setDesc(data.description ?? "");
      setLoading(false);
    });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void refetch();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // Esc to close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Live: another user commented on THIS card → re-fetch.
  useEventListener(({ event }) => {
    if (event.type === "COMMENT_ADDED" && event.cardId === cardId) refetch();
  });

  async function submitComment() {
    const c = comment.trim();
    if (!c) return;
    setComment("");
    await createComment({ cardId, content: c });
    refetch();
  }

  async function writeWithAI() {
    if (!card) return;
    setAiLoading(true);
    try {
      const r = await generateCardDescription({ cardTitle: card.title });
      if (r.ok) setDesc(r.description);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDesc() {
    await updateCard(cardId, { description: desc });
    refetch();
  }

  // ── Cover / attachments / checklists / move ────────────────────────────────
  const [itemDraft, setItemDraft] = useState<Record<string, string>>({});
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBoards, setMoveBoards] = useState<Awaited<ReturnType<typeof getBoardsForMoveDialog>>>([]);
  const [moveBoardId, setMoveBoardId] = useState("");
  const [moveListId, setMoveListId] = useState("");

  async function pickColorCover(value: string) { await setCardCover(cardId, { type: "color", value }); refetch(); }
  async function clearCover() { await setCardCover(cardId, null); refetch(); }
  async function setImageCover(url: string) { await setCardCover(cardId, { type: "image", url }); refetch(); }
  async function delAtt(id: string) { await deleteAttachment(id); refetch(); }
  async function addChecklist() { await createChecklist({ cardId, title: "Checklist" }); refetch(); }
  async function delChecklist(id: string) { await deleteChecklist(id); refetch(); }
  async function addItem(checklistId: string) {
    const t = (itemDraft[checklistId] ?? "").trim();
    if (!t) return;
    await createChecklistItem({ checklistId, title: t });
    setItemDraft((p) => ({ ...p, [checklistId]: "" }));
    refetch();
  }
  async function toggleItem(itemId: string, checked: boolean) { await updateChecklistItem(itemId, { checked }); refetch(); }
  async function delItem(itemId: string) { await deleteChecklistItem(itemId); refetch(); }
  async function openMove() { setMoveOpen((v) => !v); if (moveBoards.length === 0) setMoveBoards(await getBoardsForMoveDialog()); }
  async function doMove() { if (!moveListId) return; await moveCardToList(cardId, moveListId); onClose(); }

  const cover = card?.coverColor ?? null;
  const coverStyle = cover
    ? cover.startsWith("img:")
      ? { backgroundImage: `url(${cover.slice(4)})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: cover }
    : undefined;
  const moveLists = moveBoards.find((b) => b.id === moveBoardId)?.lists ?? [];

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-start justify-center overflow-y-auto py-10 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-trello-surfaceRaised border border-trello-border rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-4 border-b border-trello-border">
          <h2 className="text-lg font-semibold text-trello-text pr-8">{card?.title ?? (loading ? "Loading…" : "Card")}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-trello-cardHover text-trello-textSubtle hover:text-trello-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !card ? (
          <div className="p-6 text-sm text-trello-textSubtle">Loading…</div>
        ) : (
          <div className="p-4 flex flex-col gap-5">
            {cover && <div className="h-24 -mt-4 -mx-4 mb-1 rounded-t-xl" style={coverStyle} />}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-trello-textSubtle">Cover</span>
              {COVER_COLORS.map((c) => (
                <button key={c} onClick={() => pickColorCover(c)} style={{ background: c }} className="w-6 h-6 rounded hover:ring-2 ring-white" title="Set cover colour" />
              ))}
              {cover && <button onClick={clearCover} className="text-xs text-trello-danger hover:underline">Remove</button>}
              <div className="w-px h-4 bg-trello-border mx-1" />
              <button onClick={addChecklist} className="text-xs px-2 py-1 rounded bg-muted/60 text-foreground hover:bg-muted">☑ Add checklist</button>
              <div className="relative">
                <button onClick={openMove} className="text-xs px-2 py-1 rounded bg-muted/60 text-foreground hover:bg-muted">Move</button>
                {moveOpen && (
                  <div className="absolute left-0 top-full mt-1 z-10 w-60 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl p-2 flex flex-col gap-2">
                    <select className="bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1 text-xs text-trello-text" value={moveBoardId} onChange={(e) => { setMoveBoardId(e.target.value); setMoveListId(""); }}>
                      <option value="">Select board…</option>
                      {moveBoards.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                    <select className="bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1 text-xs text-trello-text" value={moveListId} onChange={(e) => setMoveListId(e.target.value)} disabled={!moveBoardId}>
                      <option value="">Select list…</option>
                      {moveLists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                    <button onClick={doMove} disabled={!moveListId} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Move card</button>
                  </div>
                )}
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">Description</h3>
              <textarea
                rows={3} value={desc} onChange={(e) => setDesc(e.target.value)}
                placeholder="Add a description…"
                className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-3 py-2 text-sm text-trello-text outline-none resize-none"
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button onClick={saveDesc} className="btn-primary text-xs px-3 py-1.5">Save</button>
                <button onClick={writeWithAI} disabled={aiLoading} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-muted/60 text-foreground hover:bg-muted disabled:opacity-50">
                  {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Write with AI
                </button>
              </div>
            </section>

            {card.attachments.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2 flex items-center gap-1.5"><Paperclip size={13} /> Attachments</h3>
                <div className="flex flex-col gap-2">
                  {card.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 bg-trello-cardBg rounded-lg p-2">
                      {att.fileType.startsWith("image/")
                        ? <img src={att.url} alt={att.name} className="w-16 h-12 object-cover rounded shrink-0" />
                        : <div className="w-16 h-12 bg-trello-cardHover rounded flex items-center justify-center shrink-0"><FileText size={20} className="text-trello-textSubtle" /></div>}
                      <div className="min-w-0 flex-1">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-trello-text hover:underline truncate block">{att.name}</a>
                        <p className="text-xs text-trello-textSubtle">{(att.fileSize / 1024).toFixed(1)} KB · {new Date(att.createdAt).toLocaleDateString()}</p>
                        <div className="flex gap-2 mt-1">
                          {att.fileType.startsWith("image/") && <button onClick={() => setImageCover(att.url)} className="text-xs text-trello-accent hover:underline">Set as cover</button>}
                          <button onClick={() => delAtt(att.id)} className="text-xs text-trello-danger hover:underline">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2 flex items-center gap-1.5"><Paperclip size={13} /> Add attachment</h3>
              <UploadButton
                endpoint="cardAttachment"
                input={{ cardId }}
                onClientUploadComplete={() => refetch()}
                onUploadError={(err) => console.error(err)}
                appearance={{ button: "text-xs px-3 py-1.5 bg-trello-primary text-trello-textOnBold rounded ut-uploading:opacity-60", allowedContent: "text-[10px] text-trello-textSubtle" }}
              />
            </section>

            {card.checklists.length > 0 && (
              <section className="flex flex-col gap-4">
                {card.checklists.map((cl) => {
                  const total = cl.items.length;
                  const done = cl.items.filter((i) => i.checked).length;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={cl.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-sm font-semibold text-trello-text">{cl.title}</h3>
                        <button onClick={() => delChecklist(cl.id)} className="text-trello-textSubtle hover:text-trello-danger" title="Delete checklist"><X size={14} /></button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-trello-textSubtle w-8">{pct}%</span>
                        <div className="flex-1 h-1.5 bg-trello-cardHover rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {cl.items.map((it) => (
                          <div key={it.id} className="flex items-center gap-2 group">
                            <input type="checkbox" checked={it.checked} onChange={(e) => toggleItem(it.id, e.target.checked)} />
                            <span className={`flex-1 text-sm ${it.checked ? "line-through text-trello-textSubtle" : "text-trello-text"}`}>{it.title}</span>
                            <button onClick={() => delItem(it.id)} className="opacity-0 group-hover:opacity-100 text-trello-textSubtle hover:text-trello-danger"><Trash2 size={12} /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          value={itemDraft[cl.id] ?? ""} onChange={(e) => setItemDraft((p) => ({ ...p, [cl.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(cl.id); } }}
                          placeholder="Add an item…"
                          className="flex-1 bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1 text-sm text-trello-text outline-none"
                        />
                        <button onClick={() => addItem(cl.id)} className="btn-soft text-xs px-2"><Plus size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-trello-textSubtle mb-2">
                Activity
              </h3>
              <div className="flex flex-col gap-2 mb-3">
                <textarea
                  rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment… (use @name to mention)"
                  className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-3 py-2 text-sm text-trello-text outline-none resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                />
                {comment.trim() && (
                  <button onClick={submitComment} className="btn-primary text-xs px-3 py-1.5 self-start">Comment</button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  ...card.comments.map((c) => ({ kind: "comment" as const, id: c.id, createdAt: c.createdAt, author: c.author, content: c.content })),
                  ...activities.map((a) => ({ kind: "activity" as const, id: a.id, createdAt: a.createdAt, type: a.type, data: (a.data ?? {}) as Record<string, unknown>, who: a.user?.name ?? "Someone" })),
                ]
                  .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
                  .map((item) =>
                    item.kind === "comment" ? (
                      <div key={item.id} className="bg-trello-cardBg rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-trello-text">{item.author}</p>
                        <p className="text-sm text-trello-textSecondary break-words">{item.content}</p>
                        <p className="text-[10px] text-trello-textSubtle mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    ) : (
                      <div key={item.id} className="flex items-start gap-2 px-1">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-trello-textSubtle shrink-0" />
                        <p className="text-xs text-trello-textSubtle">
                          {activityMessage(item.type, item.data, item.who)}
                          <span className="ml-1 opacity-70">· {new Date(item.createdAt).toLocaleString()}</span>
                        </p>
                      </div>
                    )
                  )}
                {card.comments.length === 0 && activities.length === 0 && (
                  <p className="text-sm text-trello-textSubtle italic">No activity yet.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
