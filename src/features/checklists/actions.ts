"use server";

import { db } from "@/lib/db";
import { requireBoardEdit } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Resolve the owning board for a card/checklist/item. These also drive the
// authorization gate below — every checklist mutation must require board EDIT
// access (not merely a logged-in user), so an observer or non-member can't
// mutate checklists on a board they can't edit.
async function boardIdForCard(cardId: string): Promise<string> {
  const r = await db.card.findUnique({ where: { id: cardId }, select: { list: { select: { boardId: true } } } });
  if (!r) throw new Error("Not found");
  return r.list.boardId;
}
async function boardIdForChecklist(checklistId: string): Promise<{ boardId: string; cardId: string }> {
  const cl = await db.checklist.findUnique({ where: { id: checklistId }, select: { cardId: true } });
  if (!cl) throw new Error("Not found");
  return { cardId: cl.cardId, boardId: await boardIdForCard(cl.cardId) };
}
async function boardIdForItem(itemId: string): Promise<{ boardId: string; cardId: string }> {
  const item = await db.checklistItem.findUnique({ where: { id: itemId }, select: { checklist: { select: { cardId: true } } } });
  if (!item) throw new Error("Not found");
  const cardId = item.checklist.cardId;
  return { cardId, boardId: await boardIdForCard(cardId) };
}

export async function createChecklist(raw: unknown) {
  const data = z.object({
    cardId: z.string().uuid(),
    title: z.string().min(1).max(100).default("Checklist"),
  }).parse(raw);
  const boardId = await boardIdForCard(data.cardId);
  await requireBoardEdit(boardId);

  const last = await db.checklist.findFirst({ where: { cardId: data.cardId }, orderBy: { position: "desc" }, select: { position: true } });
  const checklist = await db.checklist.create({
    data: { cardId: data.cardId, title: data.title, position: last ? last.position + 65536 : 65536 },
    include: { items: { orderBy: { position: "asc" } } },
  });

  revalidatePath(`/board/${boardId}`);
  return { ok: true, checklist };
}

export async function deleteChecklist(checklistId: string) {
  const { boardId } = await boardIdForChecklist(checklistId);
  await requireBoardEdit(boardId);
  await db.checklist.delete({ where: { id: checklistId } });
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

export async function renameChecklist(checklistId: string, title: string) {
  const { boardId } = await boardIdForChecklist(checklistId);
  await requireBoardEdit(boardId);
  const t = z.string().min(1).max(100).parse(title);
  await db.checklist.update({ where: { id: checklistId }, data: { title: t } });
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

export async function createChecklistItem(raw: unknown) {
  const data = z.object({ checklistId: z.string().uuid(), title: z.string().min(1).max(500) }).parse(raw);
  const { boardId } = await boardIdForChecklist(data.checklistId);
  await requireBoardEdit(boardId);

  const last = await db.checklistItem.findFirst({ where: { checklistId: data.checklistId }, orderBy: { position: "desc" }, select: { position: true } });
  const item = await db.checklistItem.create({
    data: { checklistId: data.checklistId, title: data.title, position: last ? last.position + 65536 : 65536 },
  });

  revalidatePath(`/board/${boardId}`);
  return { ok: true, item };
}

export async function updateChecklistItem(itemId: string, raw: unknown) {
  const data = z.object({ title: z.string().min(1).max(500).optional(), checked: z.boolean().optional() }).parse(raw);
  const { boardId } = await boardIdForItem(itemId);
  await requireBoardEdit(boardId);
  const item = await db.checklistItem.update({ where: { id: itemId }, data });
  revalidatePath(`/board/${boardId}`);
  return { ok: true, item };
}

export async function deleteChecklistItem(itemId: string) {
  const { boardId } = await boardIdForItem(itemId);
  await requireBoardEdit(boardId);
  await db.checklistItem.delete({ where: { id: itemId } });
  revalidatePath(`/board/${boardId}`);
  return { ok: true };
}
