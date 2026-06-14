"use server";

import { db } from "@/lib/db";
import { initialPosition, recomputePositions } from "@/lib/position";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Liveblocks } from "@liveblocks/node";
import type { Json } from "@liveblocks/client";
import { recordActivity } from "@/features/activity/actions";
import { cacheDel, CacheKeys } from "@/lib/redis";
import { requireBoardEdit, requireListEdit } from "@/lib/authz";

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
    // Non-critical.
  }
}

const CreateSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().min(1).max(100),
});

export async function createList(raw: unknown) {
  const data = CreateSchema.parse(raw);
  const { sanitizeText } = await import("@/lib/sanitize");
  data.title = sanitizeText(data.title);
  await requireBoardEdit(data.boardId);
  const last = await db.list.findFirst({
    where: { boardId: data.boardId, deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const list = await db.list.create({
    data: {
      boardId: data.boardId, title: data.title,
      position: last ? last.position + 65536 : initialPosition(),
    },
  });
  revalidatePath(`/board/${data.boardId}`);
  await broadcastToBoard(data.boardId, { type: "LIST_CREATED", boardId: data.boardId });
  await recordActivity({ boardId: data.boardId, type: "list.created", data: { title: data.title } });
  await cacheDel(CacheKeys.board(data.boardId));
  return { ok: true, list };
}

export async function updateList(listId: string, raw: unknown) {
  const { boardId } = await requireListEdit(listId);
  const data = z.object({
    title: z.string().min(1).max(100).optional(),
    archived: z.boolean().optional(),
  }).parse(raw);
  const list = await db.list.update({ where: { id: listId }, data });
  revalidatePath(`/board/${boardId}`);
  return { ok: true, list };
}

export async function deleteList(listId: string) {
  const { boardId } = await requireListEdit(listId);
  await db.$transaction([
    db.card.updateMany({ where: { listId }, data: { deletedAt: new Date() } }),
    db.list.update({ where: { id: listId }, data: { deletedAt: new Date() } }),
  ]);
  revalidatePath(`/board/${boardId}`);
  await broadcastToBoard(boardId, { type: "LIST_DELETED", listId });
  await recordActivity({ boardId, type: "list.deleted", data: { listId } });
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true };
}

export async function reorderLists(boardId: string, orderedIds: string[]) {
  await requireBoardEdit(boardId);
  const positions = recomputePositions(orderedIds.length);
  await Promise.all(
    orderedIds.map((id, i) =>
      db.list.updateMany({
        where: { id, boardId },
        data: { position: positions[i] },
      })
    )
  );
  revalidatePath(`/board/${boardId}`);
  await cacheDel(CacheKeys.board(boardId));
  return { ok: true };
}
