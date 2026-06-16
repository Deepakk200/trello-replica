"use server";

import { db } from "@/lib/db";
import { initialPosition, positionBetween, recomputePositions } from "@/lib/position";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Liveblocks } from "@liveblocks/node";
import type { Json } from "@liveblocks/client";
import { recordActivity } from "@/features/activity/actions";
import { sanitizeHtml, sanitizeText } from "@/lib/sanitize";
import { createMentionNotification, notifyCardWatchers, createNotification } from "@/features/notifications/actions";
import { cacheDel, CacheKeys } from "@/lib/redis";
import { deliverWebhook } from "@/features/enterprise/webhooks";
import {
  requireUser,
  requireBoardAccess,
  requireListEdit,
  requireCardEdit,
  requireCardAccess,
} from "@/lib/authz";

// Lazily constructed so a missing key never throws at import/build time.
let _lb: Liveblocks | null = null;
function lbClient() {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) return null;
  _lb ??= new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY });
  return _lb;
}
async function broadcastToBoard(boardId: string, event: Json) {
  const client = lbClient();
  if (!client || !boardId) return;
  try {
    await client.broadcastEvent(boardId, event);
  } catch {
    // Non-critical — a broadcast failure must never break the action.
  }
}

export async function createCard(raw: unknown) {
  const data = z.object({
    listId: z.string().uuid(),
    title: z.string().min(1).max(500),
  }).parse(raw);
  const { boardId } = await requireListEdit(data.listId);
  data.title = sanitizeText(data.title);
  const last = await db.card.findFirst({
    where: { listId: data.listId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const { slugify, shortId } = await import("@/lib/slug");
  const card = await db.card.create({
    data: {
      listId: data.listId, title: data.title,
      position: last ? last.position + 65536 : initialPosition(),
      shortId: shortId(),
      slug: slugify(data.title),
    },
    include: { labels: { select: { labelId: true } }, _count: { select: { comments: true } } },
  });
  revalidatePath(`/board/${boardId}`);
  await broadcastToBoard(boardId, { type: "CARD_CREATED", listId: data.listId });
  await recordActivity({ boardId, cardId: card.id, type: "card.created", data: { title: data.title, listId: data.listId } });
  await cacheDel(CacheKeys.board(boardId));
  try {
    const bd = await db.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
    if (bd?.workspaceId) await deliverWebhook(bd.workspaceId, "card.created", { cardId: card.id, title: card.title, listId: card.listId });
  } catch { /* fire-and-forget */ }
  return { ok: true, card };
}

export async function updateCard(cardId: string, raw: unknown) {
  const { boardId } = await requireCardEdit(cardId);
  const data = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    completed: z.boolean().optional(),
    coverColor: z.string().nullable().optional(),
    archived: z.boolean().optional(),
  }).parse(raw);
  if (data.title) data.title = sanitizeText(data.title);
  if (typeof data.description === "string") data.description = sanitizeHtml(data.description);
  const card = await db.card.update({
    where: { id: cardId }, data,
    include: { labels: { select: { labelId: true } }, _count: { select: { comments: true } } },
  });
  const patch = data as Record<string, unknown>;
  if (patch.title) await recordActivity({ cardId, boardId, type: "card.renamed", data: { title: String(patch.title) } });
  if (patch.description !== undefined) await recordActivity({ cardId, boardId, type: "card.description.changed", data: {} });
  if (patch.dueDate !== undefined) await recordActivity({ cardId, boardId, type: patch.dueDate ? "due.set" : "due.cleared", data: { dueDate: patch.dueDate ? (patch.dueDate as Date).toISOString() : null } });
  if (patch.completed !== undefined) await recordActivity({ cardId, boardId, type: "card.completed", data: { completed: Boolean(patch.completed) } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true, card };
}

export async function deleteCard(cardId: string) {
  const { boardId } = await requireCardEdit(cardId);
  await db.card.update({ where: { id: cardId }, data: { deletedAt: new Date() } });
  revalidatePath(`/board/${boardId}`);
  await broadcastToBoard(boardId, { type: "CARD_DELETED", cardId });
  await recordActivity({ boardId, cardId, type: "card.archived", data: {} });
  await cacheDel(CacheKeys.board(boardId));
  try {
    const bd = await db.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
    if (bd?.workspaceId) await deliverWebhook(bd.workspaceId, "card.deleted", { cardId });
  } catch { /* fire-and-forget */ }
  return { ok: true };
}

export async function moveCard(raw: unknown) {
  const data = z.object({
    cardId: z.string().uuid(),
    toListId: z.string().uuid(),
    beforePosition: z.number().nullable(),
    afterPosition: z.number().nullable(),
  }).parse(raw);
  await requireCardEdit(data.cardId);
  const { boardId } = await requireListEdit(data.toListId);
  const position = positionBetween(data.beforePosition, data.afterPosition);
  const card = await db.card.update({
    where: { id: data.cardId },
    data: { listId: data.toListId, position },
  });
  revalidatePath(`/board/${boardId}`);
  await recordActivity({ boardId, cardId: data.cardId, type: "card.moved", data: { toListId: data.toListId } });
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true, card };
}

export async function reorderCardsInList(listId: string, orderedIds: string[]) {
  const { boardId } = await requireListEdit(listId);
  const positions = recomputePositions(orderedIds.length);
  await Promise.all(
    orderedIds.map((id, i) =>
      db.card.updateMany({ where: { id, listId }, data: { position: positions[i] } })
    )
  );
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

export async function toggleCardLabel(cardId: string, labelId: string) {
  const { boardId } = await requireCardEdit(cardId);
  const existing = await db.cardLabel.findUnique({
    where: { cardId_labelId: { cardId, labelId } },
  });
  if (existing) {
    await db.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } });
  } else {
    await db.cardLabel.create({ data: { cardId, labelId } });
  }
  revalidatePath(`/board/${boardId}`);
  await recordActivity({ cardId, boardId, type: "label.toggled", data: { labelId } });
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true };
}

export async function createComment(raw: unknown) {
  const user = await requireUser();
  const data = z.object({
    cardId: z.string().uuid(),
    content: z.string().min(1).max(5000),
  }).parse(raw);
  data.content = sanitizeText(data.content);
  const { boardId } = await requireCardEdit(data.cardId);
  const comment = await db.comment.create({
    data: {
      cardId: data.cardId,
      content: data.content,
      userId: user.id,
      author: user.name ?? "Anonymous",
    },
  });
  revalidatePath(`/board/${boardId}`);
  await broadcastToBoard(boardId, { type: "COMMENT_ADDED", cardId: data.cardId });
  await recordActivity({ boardId, cardId: data.cardId, type: "comment.added", data: { author: user.name ?? "Anonymous", preview: data.content.slice(0, 80) } });
  await cacheDel(CacheKeys.board(boardId));
  try {
    const bd = await db.board.findUnique({ where: { id: boardId }, select: { workspaceId: true } });
    if (bd?.workspaceId) await deliverWebhook(bd.workspaceId, "comment.added", { cardId: data.cardId, preview: data.content.slice(0, 80) });
  } catch { /* fire-and-forget */ }

  // Parse @mentions → notify each matched user (best-effort, never breaks the comment).
  try {
    const mentions = data.content.match(/@([\w]+)/g) ?? [];
    if (mentions.length > 0) {
      const cardInfo = await db.card.findUnique({
        where: { id: data.cardId },
        select: { title: true, list: { select: { board: { select: { id: true, title: true } } } } },
      });
      if (cardInfo) {
        for (const mention of mentions) {
          const name = mention.slice(1);
          const mentionedUser = await db.user.findFirst({
            where: { name: { equals: name, mode: "insensitive" }, deletedAt: null },
            select: { id: true },
          });
          if (mentionedUser && mentionedUser.id !== user.id) {
            await createMentionNotification({
              mentionedUserId: mentionedUser.id,
              actorName: user.name ?? "Someone",
              cardId: data.cardId,
              cardTitle: cardInfo.title,
              boardId: cardInfo.list.board.id,
              boardTitle: cardInfo.list.board.title,
            });
          }
        }
      }
    }
  } catch {
    // Mentions are best-effort.
  }

  // Notify the card's assignees / prior commenters / board creator (not the actor).
  try {
    await notifyCardWatchers({
      cardId: data.cardId,
      actorId: user.id,
      actorName: user.name ?? "Someone",
      type: "comment",
      message: `${user.name ?? "Someone"} commented on a card you're on`,
    });
  } catch { /* best-effort */ }

  return { ok: true, comment };
}

export async function deleteComment(commentId: string, cardId: string) {
  const { boardId } = await requireCardEdit(cardId);
  await db.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

// Emoji reactions (prompt 06): toggle the actor's reaction of `emoji` on a comment.
export async function toggleReaction(commentId: string, emoji: string) {
  const user = await requireUser();
  const comment = await db.comment.findUnique({ where: { id: commentId }, select: { cardId: true } });
  if (!comment) throw new Error("Comment not found");
  const { boardId } = await requireCardEdit(comment.cardId);
  const existing = await db.reaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId: user.id, emoji } },
    select: { id: true },
  });
  if (existing) await db.reaction.delete({ where: { id: existing.id } });
  else await db.reaction.create({ data: { commentId, userId: user.id, emoji } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true as const };
}

export async function getCardDetails(cardId: string) {
  const { access } = await requireCardAccess(cardId);
  const card = await db.card.findFirst({
    where: { id: cardId, deletedAt: null },
    include: {
      labels: { include: { label: true } },
      assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      checklists: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: { reactions: { select: { emoji: true, userId: true } } },
      },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
  return card ? { ...card, _access: { role: access.role, canEdit: access.canEdit, canAdmin: access.canAdmin } } : null;
}

// ─── Phase 6: attachments, cover, move dialog, archive ───────────────────────

export async function deleteAttachment(attachmentId: string) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: { id: true, url: true, cardId: true, card: { select: { list: { select: { boardId: true } } } } },
  });
  if (!attachment) throw new Error("Attachment not found");
  await requireCardEdit(attachment.cardId);

  // Best-effort delete from UploadThing storage; DB deletion always runs.
  try {
    const { UTApi } = await import("uploadthing/server");
    const utapi = new UTApi();
    const fileKey = attachment.url.split("/").pop();
    if (fileKey) await utapi.deleteFiles([fileKey]);
  } catch {
    // Non-critical.
  }

  await db.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/board/${attachment.card.list.boardId}`);
  return { ok: true };
}

export async function setCardCover(
  cardId: string,
  coverSource: { type: "color"; value: string } | { type: "image"; url: string } | null
) {
  const { boardId } = await requireCardEdit(cardId);
  if (coverSource === null) {
    await db.card.update({ where: { id: cardId }, data: { coverColor: null } });
  } else if (coverSource.type === "color") {
    await db.card.update({ where: { id: cardId }, data: { coverColor: coverSource.value } });
  } else {
    // Image URLs are stored prefixed with "img:" for easy detection on render.
    await db.card.update({ where: { id: cardId }, data: { coverColor: `img:${coverSource.url}` } });
  }
  if (boardId) revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

// All boards + lists the current user can access (move-card dialog).
export async function getBoardsForMoveDialog() {
  const user = await requireUser();
  const { getActiveWorkspaceId } = await import("@/lib/authz");
  const wid = await getActiveWorkspaceId(user.id);
  if (!wid) return [];
  return db.board.findMany({
    where: { workspaceId: wid, deletedAt: null, closed: false },
    orderBy: { position: "asc" },
    select: {
      id: true, title: true,
      lists: { where: { deletedAt: null, archived: false }, orderBy: { position: "asc" }, select: { id: true, title: true } },
    },
  });
}

export async function moveCardToList(cardId: string, targetListId: string) {
  await requireCardEdit(cardId);
  const { boardId } = await requireListEdit(targetListId);

  const last = await db.card.findFirst({ where: { listId: targetListId, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
  await db.card.update({ where: { id: cardId }, data: { listId: targetListId, position: last ? last.position + 65536 : 65536 } });

  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

export async function getArchivedCards(boardId: string) {
  await requireBoardAccess(boardId);
  return db.card.findMany({
    where: { archived: true, deletedAt: null, list: { boardId } },
    orderBy: { updatedAt: "desc" },
    include: { list: { select: { id: true, title: true } } },
  });
}

export async function restoreCard(cardId: string) {
  const { boardId } = await requireCardEdit(cardId);
  await db.card.update({ where: { id: cardId }, data: { archived: false } });
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

// ─── Phase 3: card assignment (real workspace members) ───────────────────────

/** Members assignable to a card: the union of its board's workspace members
 *  and any per-board members. Used by the card-modal members popover. */
export async function listAssignableMembers(cardId: string) {
  const { boardId } = await requireCardAccess(cardId);
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      workspaceId: true,
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  });
  const out = new Map<string, { id: string; name: string | null; email: string | null; avatarUrl: string | null }>();
  if (board?.workspaceId) {
    const wm = await db.workspaceMember.findMany({
      where: { workspaceId: board.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    for (const m of wm) out.set(m.user.id, m.user);
  }
  for (const m of board?.members ?? []) out.set(m.user.id, m.user);
  return Array.from(out.values());
}

export async function assignCardMember(cardId: string, userId: string) {
  const { access, boardId } = await requireCardEdit(cardId);
  await db.cardAssignee.upsert({
    where: { cardId_userId: { cardId, userId } },
    create: { cardId, userId },
    update: {},
  });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  await recordActivity({ boardId, cardId, type: "member.assigned", data: { userId } });

  // Notify the newly-assigned member (unless they assigned themselves).
  if (userId !== access.userId) {
    try {
      const card = await db.card.findUnique({
        where: { id: cardId },
        select: { title: true, list: { select: { boardId: true, board: { select: { title: true } } } } },
      });
      if (card) {
        await createNotification({
          userId,
          type: "assigned",
          data: {
            cardId, cardTitle: card.title,
            boardId: card.list.boardId, boardTitle: card.list.board.title,
            message: `You were assigned to "${card.title}"`,
          },
        });
      }
    } catch { /* best-effort */ }
  }
  return { ok: true as const };
}

export async function unassignCardMember(cardId: string, userId: string) {
  const { boardId } = await requireCardEdit(cardId);
  await db.cardAssignee.deleteMany({ where: { cardId, userId } });
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  await recordActivity({ boardId, cardId, type: "member.unassigned", data: { userId } });
  return { ok: true as const };
}
