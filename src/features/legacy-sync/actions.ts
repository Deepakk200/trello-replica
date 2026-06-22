"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import type {
  ActivityEntry,
  Attachment,
  Card as LegacyCard,
  Checklist,
} from "@/types";
import type { LegacySnapshot } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-phase 1c: persist the *visible legacy localStorage app* (`/`, `/b`) through
// the existing Prisma stack — snapshot load/save, NO schema change (every column
// used here was added additively in sub-phase 1a). The legacy store stays the
// client source of truth; this layer mirrors its board *data* into Postgres so it
// survives refresh and syncs across devices.
//
// Isolation: legacy boards live under a dedicated per-user workspace
// (`slug = legacy-<userId>`) so they never intermix with the db-board app's
// boards (which are scoped by the session's personal `workspaceId`).
//
// IDs: the legacy store's nanoid ids are used verbatim as the Prisma primary
// keys, so load/save round-trips are referentially stable.
//
// NOT persisted (client-only seed / device-local UI, by design): the members
// roster + per-card memberIds, client workspace grouping, board/card templates,
// notifications, inboxCards, starred/recent, panel/calendar/labs prefs. These
// stay in localStorage.
// ─────────────────────────────────────────────────────────────────────────────

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/** Deterministic per-user workspace that holds this user's legacy boards. */
async function getOrCreateLegacyWorkspace(userId: string) {
  const slug = `legacy-${userId}`;
  return db.workspace.upsert({
    where: { slug },
    create: { slug, name: "Legacy Local Boards" },
    update: {},
    select: { id: true },
  });
}

const iso = (d: Date) => d.toISOString();
const toDate = (s: string | null | undefined) => (s ? new Date(s) : null);

/**
 * DB sync is an optional enhancement over the localStorage-first legacy app. When
 * no real `DATABASE_URL` is configured, `db` targets a placeholder host and every
 * query throws — so we short-circuit to a clean no-op instead. The app stays fully
 * usable on localStorage; nothing is lost and no error is surfaced.
 */
function dbConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// ── Load: DB → legacy snapshot ───────────────────────────────────────────────

/**
 * Reconstruct the legacy board graph for the current user from Postgres.
 * Returns `null` when the user has never synced (no legacy boards yet) so the
 * client keeps its local seed and performs a one-time import on first save.
 */
export async function loadLegacyState(): Promise<LegacySnapshot | null> {
  if (!dbConfigured()) return null; // sync unavailable → keep the local cache
  const user = await requireAuth();
  const slug = `legacy-${user.id}`;
  const ws = await db.workspace.findUnique({ where: { slug }, select: { id: true } });
  if (!ws) return null;

  const boards = await db.board.findMany({
    where: { workspaceId: ws.id, deletedAt: null },
    orderBy: { position: "asc" },
    include: {
      labels: true,
      lists: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            orderBy: { position: "asc" },
            include: {
              labels: { select: { labelId: true } },
              checklists: {
                orderBy: { position: "asc" },
                include: { items: { orderBy: { position: "asc" } } },
              },
              comments: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
              attachments: true,
              activities: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });

  if (boards.length === 0) return null;

  const snapshot: LegacySnapshot = { boards: {}, lists: {}, cards: {}, labels: {} };

  for (const b of boards) {
    // Labels are global in the legacy store; we anchor them all to a board on
    // save, so gather every board's labels into the flat map (deduped by id).
    for (const lb of b.labels) {
      snapshot.labels[lb.id] = {
        id: lb.id,
        name: lb.name ?? "",
        color: lb.color as never,
      };
    }

    const listIds: string[] = [];
    for (const l of b.lists) {
      const cardIds: string[] = [];
      for (const c of l.cards) {
        const createdIso = iso(c.createdAt);

        // Merge persisted comments (type 'commented') + activity rows back into
        // the legacy `activity` feed, chronologically.
        const activity: ActivityEntry[] = [
          ...c.activities.map((a) => {
            const data = (a.data ?? {}) as { text?: string; authorInitials?: string | null };
            return {
              id: a.id,
              type: a.type as ActivityEntry["type"],
              text: data.text ?? "",
              createdAt: iso(a.createdAt),
              authorInitials: data.authorInitials ?? undefined,
            } satisfies ActivityEntry;
          }),
          ...c.comments.map((cm) => ({
            id: cm.id,
            type: "commented" as const,
            text: cm.content,
            author: cm.author,
            createdAt: iso(cm.createdAt),
          })),
        ].sort((x, y) => x.createdAt.localeCompare(y.createdAt));

        const checklists: Checklist[] = c.checklists.map((cl) => ({
          id: cl.id,
          title: cl.title,
          items: cl.items.map((it) => ({
            id: it.id,
            text: it.title,
            completed: it.checked,
            createdAt: createdIso,
          })),
        }));

        const attachments: Attachment[] = c.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          type: a.fileType as Attachment["type"],
          addedAt: iso(a.createdAt),
          addedBy: user.id,
        }));

        const cover: LegacyCard["cover"] = c.coverImage
          ? { type: "image", image: c.coverImage, size: c.coverSize as "half" | "full", textColor: (c.coverTextColor as "light" | "dark" | undefined) ?? undefined }
          : c.coverColor
            ? { type: "color", color: c.coverColor, size: c.coverSize as "half" | "full", textColor: (c.coverTextColor as "light" | "dark" | undefined) ?? undefined }
            : { type: "none", size: (c.coverSize as "half" | "full") ?? "half" };

        snapshot.cards[c.id] = {
          id: c.id,
          listId: l.id,
          title: c.title,
          description: c.description ?? "",
          number: c.number ?? 0,
          memberIds: [], // not persisted (fake members are client-seed only)
          attachments,
          labelIds: c.labels.map((x) => x.labelId),
          dueDate: c.dueDate ? iso(c.dueDate) : null,
          startDate: c.startDate ? iso(c.startDate) : null,
          completed: c.completed,
          isArchived: c.archived,
          linkedCardIds: c.linkedCardIds ?? [],
          checklists,
          activity,
          createdAt: createdIso,
          updatedAt: iso(c.updatedAt),
          cover,
        };
        cardIds.push(c.id);
      }

      snapshot.lists[l.id] = {
        id: l.id,
        boardId: b.id,
        title: l.title,
        cardIds,
        order: listIds.length,
        isArchived: l.archived,
        collapsed: l.collapsed,
      };
      listIds.push(l.id);
    }

    snapshot.boards[b.id] = {
      id: b.id,
      title: b.title,
      background: b.background,
      description: b.description ?? "",
      listIds,
      createdAt: iso(b.createdAt),
      memberIds: [], // not persisted; remapped client-side on hydrate
      nextCardNumber: b.nextCardNumber,
      // Remapped to an active client workspace on the client after load.
      workspaceId: "",
      visibility: b.visibility as never,
    };
  }

  return snapshot;
}

// ── Save: legacy snapshot → DB ───────────────────────────────────────────────

/**
 * Persist the current legacy board graph for the user. Implemented as a
 * transactional delete-and-recreate of this user's legacy workspace contents —
 * the snapshot is small (single user) and this keeps the mapping diff-free.
 */
export async function saveLegacyState(snapshot: LegacySnapshot): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!dbConfigured()) return { ok: true, skipped: true }; // no DB → localStorage-only, not an error
  const user = await requireAuth();
  if (!snapshot || typeof snapshot !== "object") return { ok: false };
  const ws = await getOrCreateLegacyWorkspace(user.id);

  const boards = Object.values(snapshot.boards ?? {});
  const lists = snapshot.lists ?? {};
  const cards = snapshot.cards ?? {};
  const labels = snapshot.labels ?? {};

  // ── Build all rows up front (createMany is flat, no nested writes) ──────────
  const boardRows: Prisma.BoardCreateManyInput[] = [];
  const listRows: Prisma.ListCreateManyInput[] = [];
  const labelRows: Prisma.LabelCreateManyInput[] = [];
  const cardRows: Prisma.CardCreateManyInput[] = [];
  const cardLabelRows: Prisma.CardLabelCreateManyInput[] = [];
  const checklistRows: Prisma.ChecklistCreateManyInput[] = [];
  const itemRows: Prisma.ChecklistItemCreateManyInput[] = [];
  const commentRows: Prisma.CommentCreateManyInput[] = [];
  const attachmentRows: Prisma.AttachmentCreateManyInput[] = [];
  const activityRows: Prisma.ActivityCreateManyInput[] = [];

  const boardIds = boards.map((b) => b.id);
  const anchorBoardId = boardIds[0]; // global labels are anchored to the first board

  // Global label pool (only persisted when there is a board to anchor them to).
  if (anchorBoardId) {
    for (const lb of Object.values(labels)) {
      labelRows.push({ id: lb.id, boardId: anchorBoardId, name: lb.name || null, color: lb.color });
    }
  }
  const labelIdSet = new Set(labelRows.map((l) => l.id!));

  boards.forEach((b, bIdx) => {
    boardRows.push({
      id: b.id,
      title: b.title,
      background: b.background,
      description: b.description || null,
      starred: false,
      position: bIdx,
      nextCardNumber: b.nextCardNumber ?? 1,
      visibility: b.visibility ?? "workspace",
      workspaceId: ws.id,
      createdById: user.id,
      createdAt: toDate(b.createdAt) ?? new Date(),
    });

    (b.listIds ?? []).forEach((listId, lIdx) => {
      const l = lists[listId];
      if (!l) return;
      listRows.push({
        id: l.id,
        boardId: b.id,
        title: l.title,
        position: lIdx,
        archived: l.isArchived ?? false,
        collapsed: l.collapsed ?? false,
      });

      (l.cardIds ?? []).forEach((cardId, cIdx) => {
        const c = cards[cardId];
        if (!c) return;
        const cover = c.cover ?? { type: "none", size: "half" };
        cardRows.push({
          id: c.id,
          listId: l.id,
          title: c.title,
          description: c.description || null,
          position: cIdx,
          dueDate: toDate(c.dueDate),
          startDate: toDate(c.startDate),
          completed: c.completed ?? false,
          archived: c.isArchived ?? false,
          number: c.number ?? null,
          linkedCardIds: c.linkedCardIds ?? [],
          coverColor: cover.type === "color" ? cover.color ?? null : null,
          coverImage: cover.type === "image" ? cover.image ?? null : null,
          coverSize: cover.size ?? "half",
          coverTextColor: cover.textColor ?? null,
          createdAt: toDate(c.createdAt) ?? new Date(),
          updatedAt: toDate(c.updatedAt) ?? new Date(),
        });

        for (const labelId of c.labelIds ?? []) {
          if (labelIdSet.has(labelId)) cardLabelRows.push({ cardId: c.id, labelId });
        }

        (c.checklists ?? []).forEach((cl, clIdx) => {
          checklistRows.push({ id: cl.id, cardId: c.id, title: cl.title, position: clIdx });
          (cl.items ?? []).forEach((it, iIdx) => {
            itemRows.push({ id: it.id, checklistId: cl.id, title: it.text, checked: it.completed ?? false, position: iIdx });
          });
        });

        for (const a of c.attachments ?? []) {
          attachmentRows.push({
            id: a.id,
            cardId: c.id,
            name: a.name,
            url: a.url,
            fileType: a.type,
            fileSize: 0,
            createdAt: toDate(a.addedAt) ?? new Date(),
          });
        }

        for (const entry of c.activity ?? []) {
          if (entry.type === "commented") {
            commentRows.push({
              id: entry.id,
              cardId: c.id,
              userId: user.id,
              author: entry.author ?? "You",
              content: entry.text,
              createdAt: toDate(entry.createdAt) ?? new Date(),
            });
          } else {
            activityRows.push({
              id: entry.id,
              boardId: b.id,
              cardId: c.id,
              userId: user.id,
              type: entry.type,
              data: { text: entry.text, authorInitials: entry.authorInitials ?? null },
              createdAt: toDate(entry.createdAt) ?? new Date(),
            });
          }
        }
      });
    });
  });

  await db.$transaction(async (tx) => {
    // Clear this user's existing legacy graph. Activities use onDelete: SetNull,
    // so delete them explicitly (by board/card) BEFORE dropping the boards,
    // otherwise they'd orphan with null refs.
    const existing = await tx.board.findMany({ where: { workspaceId: ws.id }, select: { id: true } });
    const existingBoardIds = existing.map((b) => b.id);
    if (existingBoardIds.length) {
      const existingCards = await tx.card.findMany({
        where: { list: { boardId: { in: existingBoardIds } } },
        select: { id: true },
      });
      const existingCardIds = existingCards.map((c) => c.id);
      await tx.activity.deleteMany({
        where: { OR: [{ boardId: { in: existingBoardIds } }, { cardId: { in: existingCardIds } }] },
      });
      await tx.board.deleteMany({ where: { id: { in: existingBoardIds } } });
    }

    // Recreate in FK order: Board → List → Label → Card → CardLabel →
    // Checklist → ChecklistItem → Comment → Attachment → Activity.
    if (boardRows.length) await tx.board.createMany({ data: boardRows });
    if (listRows.length) await tx.list.createMany({ data: listRows });
    if (labelRows.length) await tx.label.createMany({ data: labelRows });
    if (cardRows.length) await tx.card.createMany({ data: cardRows });
    if (cardLabelRows.length) await tx.cardLabel.createMany({ data: cardLabelRows, skipDuplicates: true });
    if (checklistRows.length) await tx.checklist.createMany({ data: checklistRows });
    if (itemRows.length) await tx.checklistItem.createMany({ data: itemRows });
    if (commentRows.length) await tx.comment.createMany({ data: commentRows });
    if (attachmentRows.length) await tx.attachment.createMany({ data: attachmentRows });
    if (activityRows.length) await tx.activity.createMany({ data: activityRows });
  });

  revalidatePath("/");
  return { ok: true };
}
