"use server";

import { db } from "@/lib/db";
import { requireBoardEdit } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { initialPosition } from "@/lib/position";

// Resolve a list's board, gating on EDIT access via the central authz module
// (not the stale single-workspace JWT check — that bypassed board-membership
// sharing and let observers mutate). Returns the boardId for reuse.
async function requireListBoardEdit(listId: string): Promise<string> {
  const list = await db.list.findFirst({ where: { id: listId, deletedAt: null }, select: { boardId: true } });
  if (!list) throw new Error("List not found");
  await requireBoardEdit(list.boardId);
  return list.boardId;
}

// Copy a list (and all its cards) within the same board.
export async function copyList(listId: string, newTitle?: string) {
  await requireListBoardEdit(listId);
  const source = await db.list.findFirst({
    where: { id: listId },
    include: { cards: { where: { deletedAt: null, archived: false }, orderBy: { position: "asc" }, include: { labels: true } } },
  });
  if (!source) throw new Error("List not found");

  const last = await db.list.findFirst({ where: { boardId: source.boardId, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
  const newList = await db.list.create({
    data: { boardId: source.boardId, title: newTitle ?? `${source.title} (copy)`, position: last ? last.position + 65536 : initialPosition() },
  });

  for (let i = 0; i < source.cards.length; i++) {
    const srcCard = source.cards[i];
    const newCard = await db.card.create({
      data: {
        listId: newList.id,
        title: srcCard.title,
        description: srcCard.description,
        dueDate: srcCard.dueDate,
        coverColor: srcCard.coverColor,
        position: (i + 1) * 65536,
      },
    });
    for (const cl of srcCard.labels) {
      await db.cardLabel.create({ data: { cardId: newCard.id, labelId: cl.labelId } });
    }
  }

  revalidatePath(`/board/${source.boardId}`);
  return { ok: true, newListId: newList.id };
}

// Move all cards in a list to another list.
export async function moveAllCards(fromListId: string, toListId: string) {
  const [from, to] = await Promise.all([
    db.list.findFirst({ where: { id: fromListId, deletedAt: null }, select: { id: true, boardId: true } }),
    db.list.findFirst({ where: { id: toListId, deletedAt: null }, select: { id: true, boardId: true } }),
  ]);
  if (!from || !to) throw new Error("List not found");
  // Must be able to edit both the source and destination boards.
  await requireBoardEdit(from.boardId);
  if (to.boardId !== from.boardId) await requireBoardEdit(to.boardId);

  const lastInTo = await db.card.findFirst({ where: { listId: toListId, deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });
  const cards = await db.card.findMany({ where: { listId: fromListId, deletedAt: null, archived: false }, orderBy: { position: "asc" }, select: { id: true } });

  let pos = lastInTo ? lastInTo.position : 0;
  for (const card of cards) {
    pos += 65536;
    await db.card.update({ where: { id: card.id }, data: { listId: toListId, position: pos } });
  }

  revalidatePath(`/board/${from.boardId}`);
  return { ok: true, movedCount: cards.length };
}

// Sort cards in a list by title (A→Z) or due date (ascending, nulls last).
export async function sortCardsInList(listId: string, by: "title" | "dueDate") {
  const boardId = await requireListBoardEdit(listId);
  const list = { boardId };

  const cards = await db.card.findMany({
    where: { listId, deletedAt: null, archived: false },
    orderBy: by === "title" ? { title: "asc" } : [{ dueDate: { sort: "asc", nulls: "last" } }],
    select: { id: true },
  });

  await Promise.all(cards.map((card, i) => db.card.update({ where: { id: card.id }, data: { position: (i + 1) * 65536 } })));

  revalidatePath(`/board/${list.boardId}`);
  return { ok: true };
}
