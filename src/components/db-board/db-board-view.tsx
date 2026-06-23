"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, closestCorners, type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, X, GripVertical, Star, ChevronDown, LayoutDashboard, MoreHorizontal, AlignLeft, Paperclip, CheckSquare, Pencil, Copy, Plug, Zap, Circle, CheckCircle2, Users } from "lucide-react";
import { type getBoard, updateBoard } from "@/features/boards/actions";
import { BOARD_BACKGROUNDS } from "./create-board-tile";
import { BoardFilterButton, cardMatches, filterCount, EMPTY_FILTER, type BoardFilter } from "./board-filter";
import { moveCard, createCard, deleteCard, updateCard } from "@/features/cards/actions";
import { createList, deleteList, updateList, reorderLists } from "@/features/lists/actions";
import { copyList, moveAllCards, sortCardsInList } from "@/features/lists/bulk-actions";
import { positionBetween } from "@/lib/position";
import {
  useMyPresence, useSelf, useOthers, useBroadcastEvent, useEventListener,
} from "@/lib/liveblocks.config";
import { MemberPopover } from "./member-popover";
import { LiveCursors } from "./live-cursors";
import { DbCardModal } from "./db-card-modal";
import { BoardMenuPanel } from "./board-menu-panel";
import { BoardShareBar } from "./board-share-bar";
import { exportBoardAsCSV } from "@/features/enterprise/export";
import { notify } from "@/store/use-toast-store";
import * as Sentry from "@sentry/nextjs";

type BoardData = NonNullable<Awaited<ReturnType<typeof getBoard>>>;
type ListData = BoardData["lists"][number];
type CardData = ListData["cards"][number];

export function DbBoardView({ board }: { board: BoardData }) {
  const [b, setB] = useState<BoardData>(board);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep-link: /board/[id]?card=<id> (e.g. from Cmd+K search) opens that card.
  useEffect(() => {
    const cardId = searchParams.get("card");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the deep-linked card on mount/param change
    if (cardId) setOpenCardId(cardId);
  }, [searchParams]);

  // Effective access for the current user (read-only for OBSERVER/GUEST).
  const canEdit = b._access?.canEdit ?? true;
  const canAdmin = b._access?.canAdmin ?? false;

  // Server-refreshed prop wins (re-fetched after mutations / broadcasts).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs local state to the refreshed server prop
  useEffect(() => setB(board), [board]);

  const labelColor = new Map(b.labels.map((l) => [l.id, l.color]));

  // ── Presence / cursors / broadcast ────────────────────────────────────────
  const [, updateMyPresence] = useMyPresence();
  const self = useSelf();
  const others = useOthers();
  const { data: session } = useSession();
  const broadcast = useBroadcastEvent();

  useEffect(() => {
    if (session?.user) {
      updateMyPresence({
        cursor: null,
        selectedCardId: null,
        user: {
          id: session.user.id,
          name: session.user.name ?? "Anonymous",
          avatarUrl: session.user.image ?? null,
          color: self?.info?.color ?? "#0079BF",
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, self?.info?.color]);

  // Any structural change broadcast by another user → re-fetch from server.
  useEventListener(({ event }) => {
    if (
      event.type === "CARD_MOVED" || event.type === "CARD_CREATED" ||
      event.type === "CARD_DELETED" || event.type === "LIST_CREATED" ||
      event.type === "LIST_DELETED" || event.type === "COMMENT_ADDED"
    ) {
      router.refresh();
    }
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const cardId = String(e.active.id);
    const over = e.over;
    if (!over) return;
    const overData = over.data.current as { type: string; listId: string; position?: number } | undefined;
    if (!overData) return;

    // ── List reorder (active is a list, dragged by its grip handle) ──
    const activeData = e.active.data.current as { type?: string; listId?: string } | undefined;
    if (activeData?.type === "list-reorder") {
      const movingListId = activeData.listId;
      const overListId = overData.listId;
      if (!movingListId || !overListId || overListId === movingListId) return;
      const ids = b.lists.map((l) => l.id);
      const from = ids.indexOf(movingListId);
      const to = ids.indexOf(overListId);
      if (from < 0 || to < 0) return;
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, movingListId);
      const snapshot = b;
      setB((prev) => ({ ...prev, lists: [...prev.lists].sort((a, c) => next.indexOf(a.id) - next.indexOf(c.id)) }));
      startTransition(async () => {
        try { await reorderLists(b.id, next); router.refresh(); }
        catch (err) { setB(snapshot); notify.error("Couldn't reorder the lists"); Sentry.captureException(err); }
      });
      return;
    }

    const toListId = overData.listId;

    // Snapshot from current state.
    let moving: CardData | undefined;
    let fromListId = "";
    for (const l of b.lists) {
      const found = l.cards.find((c) => c.id === cardId);
      if (found) { moving = found; fromListId = l.id; break; }
    }
    if (!moving) return;

    const targetCards = (b.lists.find((l) => l.id === toListId)?.cards ?? []).filter((c) => c.id !== cardId);
    let before: number | null;
    let after: number | null;
    if (overData.type === "card" && typeof overData.position === "number") {
      const idx = targetCards.findIndex((c) => c.position === overData.position);
      before = idx > 0 ? targetCards[idx - 1].position : null;
      after = idx >= 0 ? targetCards[idx].position : null;
    } else {
      before = targetCards.length ? targetCards[targetCards.length - 1].position : null;
      after = null;
    }
    if (fromListId === toListId && before === null && after === null && targetCards.length === 0) return;

    const newPos = positionBetween(before, after);
    const moved: CardData = { ...moving, listId: toListId, position: newPos };

    // Snapshot the pre-move board so a failed server move can visibly snap back.
    const snapshot = b;
    const applyOptimistic = () => setB((prev) => ({
      ...prev,
      lists: prev.lists.map((l) => {
        if (l.id === fromListId && l.id !== toListId) {
          return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
        }
        if (l.id === toListId) {
          const rest = l.cards.filter((c) => c.id !== cardId);
          return { ...l, cards: [...rest, moved].sort((a, c) => a.position - c.position) };
        }
        return l;
      }),
    }));

    const attempt = () => startTransition(async () => {
      try {
        await moveCard({ cardId, toListId, beforePosition: before, afterPosition: after });
        broadcast({ type: "CARD_MOVED", cardId, toListId, position: newPos });
        router.refresh();
      } catch (err) {
        // Roll back the optimistic move so the card snaps back — never a mystery revert.
        setB(snapshot);
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        notify.error(
          offline ? "You're offline — the card couldn't be moved" : "Couldn't move the card",
          { action: { label: "Retry", onClick: () => { applyOptimistic(); attempt(); } } },
        );
        Sentry.captureException(err);
      }
    });

    applyOptimistic();
    attempt();
  }, [b, broadcast, router]);

  // Run a mutating server action in a transition, surfacing failures (never
  // silent) with a human message + Retry instead of an unhandled throw.
  function run(action: () => Promise<unknown>, errorMsg: string) {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        const offline = typeof navigator !== "undefined" && !navigator.onLine;
        notify.error(offline ? "You're offline — that change didn't save" : errorMsg, {
          action: { label: "Retry", onClick: () => run(action, errorMsg) },
        });
        Sentry.captureException(err);
      }
    });
  }

  // Board title + background editing (optimistic, snap-back on failure).
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(b.title);
  const [moreOpen, setMoreOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [starred, setStarred] = useState<boolean>(Boolean((b as { starred?: boolean }).starred));

  function toggleStar() {
    const next = !starred;
    setStarred(next);
    startTransition(async () => {
      try { await updateBoard(b.id, { starred: next }); router.refresh(); }
      catch (err) { setStarred(!next); notify.error("Couldn't update star"); Sentry.captureException(err); }
    });
  }

  // Client-side card filter (Trello "Filter"): hides non-matching cards.
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  const matches = (card: CardData) => cardMatches(card, filter);
  const activeFilters = filterCount(filter);

  function saveBoard(patch: { title?: string; background?: string }) {
    const snapshot = b;
    setB((prev) => ({ ...prev, ...patch }));
    startTransition(async () => {
      try { await updateBoard(b.id, patch); router.refresh(); }
      catch (err) { setB(snapshot); notify.error("Couldn't save the board"); Sentry.captureException(err); }
    });
  }

  function commitTitle() {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (t && t !== b.title) saveBoard({ title: t });
  }

  function openCard(cardId: string) {
    setOpenCardId(cardId);
    updateMyPresence({ selectedCardId: cardId });
  }
  function closeCard() {
    setOpenCardId(null);
    updateMyPresence({ selectedCardId: null });
  }

  async function handleExport() {
    try {
      const csv = await exportBoardAsCSV(b.id);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${b.title.replace(/[^a-z0-9]/gi, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("Board exported as CSV");
    } catch (err) {
      notify.error("Export failed — try again");
      Sentry.captureException(err);
    }
  }

  const initials = (session?.user?.name ?? "U").split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "U";

  function closeBoardAction() {
    setMoreOpen(false);
    run(async () => { await updateBoard(b.id, { closed: true }); router.push("/boards"); }, "Couldn't close the board");
  }
  function graceful(label: string) {
    setMoreOpen(false);
    notify.info(`${label} isn't available yet`);
  }

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{ background: b.background }}
      onPointerMove={(e) => updateMyPresence({ cursor: { x: e.clientX, y: e.clientY } })}
      onPointerLeave={() => updateMyPresence({ cursor: null })}
    >
      <header className="px-4 py-3 shrink-0 flex items-center gap-3">
        <button className="flex items-center gap-1.5 text-white/90 hover:bg-white/15 rounded px-2 py-1 text-sm font-medium shrink-0" title="Board view">
          <LayoutDashboard size={15} /><span className="hidden sm:inline">Board</span><ChevronDown size={13} className="text-white/70" />
        </button>
        {editingTitle && canEdit ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTitle(); } if (e.key === "Escape") setEditingTitle(false); }}
            aria-label="Board title"
            className="font-bold text-base bg-white/15 text-white rounded px-1.5 py-0.5 outline-none ring-2 ring-white/40 min-w-0 max-w-[40vw]"
          />
        ) : (
          <h1
            onClick={() => { if (canEdit) { setTitleDraft(b.title); setEditingTitle(true); } }}
            className={`text-white font-bold text-base rounded px-1.5 py-0.5 truncate max-w-[40vw] ${canEdit ? "cursor-text hover:bg-white/15" : ""}`}
            title={canEdit ? "Click to rename" : undefined}
          >
            {b.title}
          </h1>
        )}
        {!canEdit && (
          <span className="text-[10px] uppercase font-semibold tracking-wide bg-white/20 text-white px-1.5 py-0.5 rounded">View only</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Single account avatar — opens the member profile popover */}
          <button
            onClick={() => setMemberOpen(true)}
            className="relative w-7 h-7 rounded-full bg-[#00B8D9] text-white text-[11px] font-bold flex items-center justify-center shrink-0 select-none"
            aria-label="Account"
            aria-haspopup="dialog"
            title={initials}
            suppressHydrationWarning
          >
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1D2125] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#579DFF]" />
            </span>
          </button>
          <button onClick={() => graceful("Power-Ups")} title="Power-Ups" className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded">
            <Plug size={16} />
          </button>
          <button onClick={() => graceful("Automation")} title="Automation" className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded">
            <Zap size={16} />
          </button>
          <BoardFilterButton
            labels={b.labels.map((l) => ({ id: l.id, name: l.name, color: l.color }))}
            members={b.members.map((m) => ({ userId: m.userId, user: { name: m.user.name, avatarUrl: m.user.avatarUrl } }))}
            filter={filter}
            onChange={setFilter}
          />
          <button
            onClick={toggleStar}
            aria-pressed={starred}
            title={starred ? "Unstar this board" : "Star this board"}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded"
          >
            <Star size={16} className={starred ? "fill-yellow-400 text-yellow-400" : ""} />
          </button>
          <button onClick={() => graceful("Members")} title="Members" className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded">
            <Users size={16} />
          </button>
          <BoardShareBar
            boardId={b.id}
            members={b.members.map((m) => ({ userId: m.userId, role: m.role, user: m.user }))}
            visibility={b.visibility}
            canAdmin={canAdmin}
          />
          {/* "⋯" — opens Trello's right-docked board menu panel. */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            title="Show menu"
            className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>

      {activeFilters > 0 && (
        <div className="px-4 pb-2 shrink-0 flex items-center gap-2 text-sm text-white">
          <span className="bg-black/25 rounded px-2 py-1">
            Filtering — {activeFilters} {activeFilters === 1 ? "criterion" : "criteria"}
          </span>
          <button onClick={() => setFilter(EMPTY_FILTER)} className="underline hover:no-underline text-white/90">
            Clear filters
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex-1 min-h-0 overflow-x-auto px-3 pb-4">
          <div className="flex gap-3 items-start h-full">
            {b.lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                boardLists={b.lists.map((l) => ({ id: l.id, title: l.title }))}
                labelColor={labelColor}
                canEdit={canEdit}
                matches={activeFilters > 0 ? matches : null}
                viewersFor={(cid) => others.filter((o) => o.presence?.selectedCardId === cid)}
                onOpenCard={openCard}
                onDeleteCard={(cid) => run(() => deleteCard(cid), "Couldn't delete the card")}
                onRenameCard={(cid, t) => run(() => updateCard(cid, { title: t }), "Couldn't rename the card")}
                onToggleCardComplete={(cid, done) => run(() => updateCard(cid, { completed: done }), "Couldn't update the card")}
                onAddCard={(title) => run(() => createCard({ listId: list.id, title }), "Couldn't add the card")}
                onDeleteList={() => run(() => deleteList(list.id), "Couldn't delete the list")}
              />
            ))}
            {canEdit && <AddListForm onAdd={(title) => run(() => createList({ boardId: b.id, title }), "Couldn't add the list")} />}
          </div>
        </div>
      </DndContext>

      <LiveCursors />

      {openCardId && <DbCardModal cardId={openCardId} boardId={b.id} boardLabels={b.labels} onClose={closeCard} />}

      {memberOpen && (
        <MemberPopover
          onClose={() => setMemberOpen(false)}
          onEditProfile={() => { setMemberOpen(false); router.push("/settings"); }}
          onViewActivity={() => { setMemberOpen(false); graceful("Board activity"); }}
        />
      )}

      {moreOpen && (
        <BoardMenuPanel
          onClose={() => setMoreOpen(false)}
          canEdit={canEdit}
          starred={starred}
          visibility={b.visibility}
          backgrounds={BOARD_BACKGROUNDS}
          currentBg={b.background}
          initials={initials}
          onToggleStar={toggleStar}
          onChangeBackground={(sw) => { setMoreOpen(false); saveBoard({ background: sw }); }}
          onExport={() => { setMoreOpen(false); handleExport(); }}
          onSettings={() => { setMoreOpen(false); router.push("/settings"); }}
          onCloseBoard={closeBoardAction}
          onGraceful={graceful}
        />
      )}
    </div>
  );
}

// ── List column ──────────────────────────────────────────────────────────────
function ListColumn({
  list, boardLists, labelColor, canEdit, matches, viewersFor, onOpenCard, onDeleteCard, onRenameCard, onToggleCardComplete, onAddCard, onDeleteList,
}: {
  list: ListData;
  boardLists: { id: string; title: string }[];
  labelColor: Map<string, string>;
  canEdit: boolean;
  matches: ((card: CardData) => boolean) | null;
  viewersFor: (cardId: string) => { connectionId: number; info?: { color: string; name: string } }[];
  onOpenCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
  onRenameCard: (cardId: string, title: string) => void;
  onToggleCardComplete: (cardId: string, completed: boolean) => void;
  onAddCard: (title: string) => void;
  onDeleteList: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${list.id}`, data: { type: "list", listId: list.id } });
  const listDrag = useDraggable({ id: `listdrag:${list.id}`, data: { type: "list-reorder", listId: list.id }, disabled: !canEdit });
  const setListRef = (el: HTMLElement | null) => { listDrag.setNodeRef(el); };
  const listDragStyle = listDrag.transform
    ? { transform: `translate3d(${listDrag.transform.x}px, ${listDrag.transform.y}px, 0)`, zIndex: 50 }
    : undefined;
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(list.title);
  const router = useRouter();

  const visibleCards = matches ? list.cards.filter(matches) : list.cards;

  async function saveTitle() {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (t && t !== list.title) { await updateList(list.id, { title: t }); router.refresh(); }
  }

  const otherLists = boardLists.filter((l) => l.id !== list.id);
  async function doCopy() { setMenuOpen(false); await copyList(list.id); router.refresh(); }
  async function doSort(by: "title" | "dueDate") { setMenuOpen(false); await sortCardsInList(list.id, by); router.refresh(); }
  async function doMoveAll(toId: string) { setMenuOpen(false); await moveAllCards(list.id, toId); router.refresh(); }

  return (
    <div
      ref={setListRef}
      style={listDragStyle}
      className={`w-[272px] shrink-0 max-h-full flex flex-col rounded-xl bg-trello-listBg ${isOver ? "ring-2 ring-trello-accent" : ""} ${listDrag.isDragging ? "opacity-60" : ""}`}
    >
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {canEdit && (
            <button
              {...(canEdit ? listDrag.attributes : {})} {...(canEdit ? listDrag.listeners : {})}
              className="cursor-grab text-trello-textSubtle hover:text-white shrink-0 touch-none" title="Drag to reorder list" aria-label="Reorder list"
            >
              <GripVertical size={14} />
            </button>
          )}
          {editingTitle && canEdit ? (
            <input
              autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTitle(); } if (e.key === "Escape") setEditingTitle(false); }}
              className="w-full mr-1 text-sm font-semibold bg-trello-cardBg border border-trello-borderSubtle rounded px-1.5 py-0.5 text-trello-text outline-none"
            />
          ) : (
            <h2
              onClick={() => { if (canEdit) { setTitleDraft(list.title); setEditingTitle(true); } }}
              className={`text-sm font-semibold text-white truncate ${canEdit ? "cursor-text" : ""}`}
            >
              {list.title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-trello-textSubtle">{matches ? `${visibleCards.length}/${list.cards.length}` : list.cards.length}</span>
          {canEdit && <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} title="List actions" className="text-trello-textSubtle hover:text-white text-sm px-1 leading-none">⋯</button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-trello-surfaceRaised border border-trello-border rounded-lg shadow-xl py-1 text-sm">
                  <button onClick={doCopy} className="w-full text-left px-3 py-1.5 hover:bg-trello-cardHover text-trello-text">Copy list</button>
                  <button onClick={() => doSort("title")} className="w-full text-left px-3 py-1.5 hover:bg-trello-cardHover text-trello-text">Sort by title</button>
                  <button onClick={() => doSort("dueDate")} className="w-full text-left px-3 py-1.5 hover:bg-trello-cardHover text-trello-text">Sort by due date</button>
                  <div className="border-t border-trello-border my-1" />
                  <p className="px-3 py-1 text-xs text-trello-textSubtle">Move all cards to…</p>
                  {otherLists.length === 0
                    ? <p className="px-3 py-1 text-xs text-trello-textSubtle italic">No other lists</p>
                    : otherLists.map((l) => (
                      <button key={l.id} onClick={() => doMoveAll(l.id)} className="w-full text-left px-3 py-1.5 hover:bg-trello-cardHover text-trello-text truncate">{l.title}</button>
                    ))}
                  <div className="border-t border-trello-border my-1" />
                  <button onClick={() => { setMenuOpen(false); onDeleteList(); }} className="w-full text-left px-3 py-1.5 hover:bg-red-500/15 text-trello-danger">Delete list</button>
                </div>
              </>
            )}
          </div>}
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-1.5 min-h-6">
        {visibleCards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            labelColor={labelColor}
            canEdit={canEdit}
            viewers={viewersFor(card.id)}
            onOpen={() => onOpenCard(card.id)}
            onDelete={() => onDeleteCard(card.id)}
            onRename={(t) => onRenameCard(card.id, t)}
            onToggleComplete={(done) => onToggleCardComplete(card.id, done)}
          />
        ))}
      </div>

      <div className="px-1.5 pb-2">
        {!canEdit ? null : adding ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              autoFocus rows={2} value={title} onChange={(e) => setTitle(e.target.value)}
              data-testid="card-composer-input"
              placeholder="Enter a title or paste a link"
              className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1.5 text-sm text-trello-text outline-none resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (title.trim()) { onAddCard(title.trim()); setTitle(""); } }
                if (e.key === "Escape") { setAdding(false); setTitle(""); }
              }}
            />
            <div className="flex items-center gap-2">
              <button data-testid="card-composer-submit" onClick={() => { if (title.trim()) { onAddCard(title.trim()); setTitle(""); } }} className="btn-primary text-xs px-3 py-1.5">Add card</button>
              <span className="text-[11px] text-trello-textSubtle bg-trello-cardHover rounded px-1.5 py-0.5">Tip</span>
              <button onClick={() => { setAdding(false); setTitle(""); }} aria-label="Cancel" className="ml-auto text-trello-textSubtle hover:text-trello-text p-1 rounded hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <button data-testid="card-add-trigger" onClick={() => setAdding(true)} className="flex-1 flex items-center gap-1.5 text-sm text-trello-textSubtle hover:text-trello-text px-2 py-1.5 rounded hover:bg-white/5">
              <Plus className="w-4 h-4" /> Add a card
            </button>
            <button aria-label="Card templates" title="Card templates" className="text-trello-textSubtle hover:text-trello-text p-1.5 rounded hover:bg-white/5">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Draggable + droppable card ───────────────────────────────────────────────
function DraggableCard({
  card, labelColor, canEdit, viewers, onOpen, onDelete, onRename, onToggleComplete,
}: {
  card: CardData;
  labelColor: Map<string, string>;
  canEdit: boolean;
  viewers: { connectionId: number; info?: { color: string; name: string } }[];
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onToggleComplete: (completed: boolean) => void;
}) {
  const drag = useDraggable({ id: card.id, data: { type: "card", listId: card.listId, position: card.position }, disabled: !canEdit });
  const drop = useDroppable({ id: `card:${card.id}`, data: { type: "card", listId: card.listId, position: card.position } });
  const ref = (el: HTMLElement | null) => { drag.setNodeRef(el); drop.setNodeRef(el); };
  const style = drag.transform
    ? { transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`, zIndex: 40 }
    : undefined;

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(card.title);

  // Aggregate checklist progress across all checklists on the card.
  const items = card.checklists.flatMap((c) => c.items);
  const checkTotal = items.length;
  const checkDone = items.filter((i) => i.checked).length;
  const hasDesc = Boolean(card.description && card.description.trim());

  return (
    <div
      ref={ref}
      style={style}
      {...(canEdit ? drag.attributes : {})}
      {...(canEdit ? drag.listeners : {})}
      data-testid="card"
      onClick={onOpen}
      className={`group bg-[var(--card-bg)] rounded-lg p-2 cursor-pointer shadow-[0_1px_1px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] hover:ring-2 hover:ring-inset hover:ring-white/30 transition-shadow ${drag.isDragging ? "opacity-40" : ""}`}
    >
      {card.coverColor && (
        <div
          className="h-8 -mx-2 -mt-2 mb-2 rounded-t-lg"
          style={card.coverColor.startsWith("img:")
            ? { backgroundImage: `url(${card.coverColor.slice(4)})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: card.coverColor }}
        />
      )}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {card.labels.map(({ labelId }) => (
            <span key={labelId} className="h-2 w-10 rounded-full" style={{ background: labelColor.get(labelId) ?? "var(--label-black)" }} />
          ))}
        </div>
      )}
      {renaming ? (
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setRenaming(false); const t = draft.trim(); if (t && t !== card.title) onRename(t); }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); setRenaming(false); const t = draft.trim(); if (t && t !== card.title) onRename(t); }
            if (e.key === "Escape") { setRenaming(false); setDraft(card.title); }
          }}
          className="w-full text-sm bg-trello-cardBg border border-trello-accent rounded px-1.5 py-1 text-[var(--text-primary)] outline-none resize-none"
        />
      ) : (
        <div className="flex items-start gap-1">
          {(canEdit || card.completed) && (
            <button
              onClick={canEdit ? (e) => { e.stopPropagation(); onToggleComplete(!card.completed); } : undefined}
              disabled={!canEdit}
              title={card.completed ? "Mark incomplete" : "Mark complete"}
              aria-pressed={card.completed}
              className={`shrink-0 mt-0.5 overflow-hidden transition-all duration-150 ease-out motion-reduce:transition-none ${
                card.completed ? "w-4 opacity-100" : "w-0 opacity-0 group-hover:w-4 group-hover:opacity-100"
              }`}
            >
              {card.completed
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <Circle className="w-4 h-4 text-white/50 hover:text-white" />}
            </button>
          )}
          <p className={`flex-1 text-sm leading-snug break-words ${card.completed ? "text-[var(--text-subtle)] line-through" : "text-[var(--text-primary)]"}`}>{card.title}</p>
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setDraft(card.title); setRenaming(true); }}
              className="opacity-0 group-hover:opacity-100 text-trello-textSubtle hover:text-white text-xs shrink-0"
              title="Edit card"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canEdit && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-trello-textSubtle hover:text-trello-danger text-xs shrink-0" title="Delete card">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {(card._count.comments > 0 || card.dueDate || card.completed || card.assignees.length > 0 || hasDesc || card._count.attachments > 0 || checkTotal > 0) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-subtle)]">
          {card.completed && <span className="text-emerald-400">✓</span>}
          {hasDesc && <AlignLeft className="w-3.5 h-3.5" />}
          {card.dueDate && (() => {
            const t = new Date(card.dueDate).getTime();
            const now = new Date().getTime();
            const cls = card.completed
              ? "bg-emerald-600/80 text-white"
              : t < now ? "bg-red-600/80 text-white"
              : t - now < 86400000 ? "bg-amber-500/90 text-black"
              : "";
            return <span className={`px-1 rounded ${cls}`}>{new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>;
          })()}
          {card._count.attachments > 0 && (
            <span className="flex items-center gap-0.5"><Paperclip className="w-3.5 h-3.5" />{card._count.attachments}</span>
          )}
          {checkTotal > 0 && (
            <span className={`flex items-center gap-0.5 ${checkDone === checkTotal ? "text-emerald-400" : ""}`}>
              <CheckSquare className="w-3.5 h-3.5" />{checkDone}/{checkTotal}
            </span>
          )}
          {card._count.comments > 0 && <span>💬 {card._count.comments}</span>}
          {card.assignees.length > 0 && (
            <div className="ml-auto flex -space-x-1.5">
              {card.assignees.slice(0, 3).map((a) =>
                a.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={a.userId} src={a.user.avatarUrl} alt={a.user.name ?? ""} title={a.user.name ?? ""} className="w-5 h-5 rounded-full object-cover ring-1 ring-black/20" />
                ) : (
                  <div key={a.userId} title={a.user.name ?? ""} className="w-5 h-5 rounded-full bg-linear-to-br from-pink-400 to-orange-400 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-black/20">
                    {(a.user.name?.[0] ?? "?").toUpperCase()}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
      {viewers.length > 0 && (
        <div className="flex gap-0.5 mt-1">
          {viewers.slice(0, 3).map((v) => (
            <div key={v.connectionId} title={v.info?.name} className="w-3 h-3 rounded-full" style={{ background: v.info?.color ?? "#0079BF" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add list ─────────────────────────────────────────────────────────────────
function AddListForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  if (!adding) {
    return (
      <button data-testid="add-list" onClick={() => { setAdding(true); setTimeout(() => ref.current?.focus(), 0); }}
        className="w-[272px] shrink-0 flex items-center gap-1.5 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2.5">
        <Plus className="w-4 h-4" /> Add another list
      </button>
    );
  }
  return (
    <div className="w-[272px] shrink-0 bg-trello-listBg rounded-xl p-2 flex flex-col gap-1.5">
      <input
        ref={ref} data-testid="list-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="List title…"
        className="w-full bg-trello-cardBg border border-trello-borderSubtle rounded px-2 py-1.5 text-sm text-trello-text outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (title.trim()) { onAdd(title.trim()); setTitle(""); setAdding(false); } }
          if (e.key === "Escape") { setAdding(false); setTitle(""); }
        }}
      />
      <div className="flex gap-2">
        <button onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(""); setAdding(false); } }} className="btn-primary text-xs px-3 py-1.5">Add list</button>
        <button onClick={() => { setAdding(false); setTitle(""); }} className="btn-ghost text-xs px-2 py-1.5">Cancel</button>
      </div>
    </div>
  );
}
