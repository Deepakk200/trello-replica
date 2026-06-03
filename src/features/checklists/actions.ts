"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function getBoardIdForCard(cardId: string): Promise<string | null> {
  const r = await db.card.findUnique({ where: { id: cardId }, select: { list: { select: { boardId: true } } } });
  return r?.list.boardId ?? null;
}

export async function createChecklist(raw: unknown) {
  await requireAuth();
  const data = z.object({
    cardId: z.string().uuid(),
    title: z.string().min(1).max(100).default("Checklist"),
  }).parse(raw);

  const last = await db.checklist.findFirst({ where: { cardId: data.cardId }, orderBy: { position: "desc" }, select: { position: true } });
  const checklist = await db.checklist.create({
    data: { cardId: data.cardId, title: data.title, position: last ? last.position + 65536 : 65536 },
    include: { items: { orderBy: { position: "asc" } } },
  });

  const boardId = await getBoardIdForCard(data.cardId);
  if (boardId) revalidatePath(`/board/${boardId}`);
  return { ok: true, checklist };
}

export async function deleteChecklist(checklistId: string) {
  await requireAuth();
  const cl = await db.checklist.findUnique({ where: { id: checklistId }, select: { cardId: true } });
  await db.checklist.delete({ where: { id: checklistId } });
  if (cl?.cardId) {
    const boardId = await getBoardIdForCard(cl.cardId);
    if (boardId) revalidatePath(`/board/${boardId}`);
  }
  return { ok: true };
}

export async function renameChecklist(checklistId: string, title: string) {
  await requireAuth();
  const t = z.string().min(1).max(100).parse(title);
  const cl = await db.checklist.update({ where: { id: checklistId }, data: { title: t }, select: { cardId: true } });
  const boardId = await getBoardIdForCard(cl.cardId);
  if (boardId) revalidatePath(`/board/${boardId}`);
  return { ok: true };
}

export async function createChecklistItem(raw: unknown) {
  await requireAuth();
  const data = z.object({ checklistId: z.string().uuid(), title: z.string().min(1).max(500) }).parse(raw);

  const last = await db.checklistItem.findFirst({ where: { checklistId: data.checklistId }, orderBy: { position: "desc" }, select: { position: true } });
  const item = await db.checklistItem.create({
    data: { checklistId: data.checklistId, title: data.title, position: last ? last.position + 65536 : 65536 },
  });

  const cl = await db.checklist.findUnique({ where: { id: data.checklistId }, select: { cardId: true } });
  if (cl?.cardId) {
    const boardId = await getBoardIdForCard(cl.cardId);
    if (boardId) revalidatePath(`/board/${boardId}`);
  }
  return { ok: true, item };
}

export async function updateChecklistItem(itemId: string, raw: unknown) {
  await requireAuth();
  const data = z.object({ title: z.string().min(1).max(500).optional(), checked: z.boolean().optional() }).parse(raw);
  const item = await db.checklistItem.update({ where: { id: itemId }, data });

  const cl = await db.checklist.findUnique({ where: { id: item.checklistId }, select: { cardId: true } });
  if (cl?.cardId) {
    const boardId = await getBoardIdForCard(cl.cardId);
    if (boardId) revalidatePath(`/board/${boardId}`);
  }
  return { ok: true, item };
}

export async function deleteChecklistItem(itemId: string) {
  await requireAuth();
  const item = await db.checklistItem.findUnique({ where: { id: itemId }, select: { checklistId: true } });
  await db.checklistItem.delete({ where: { id: itemId } });
  if (item) {
    const cl = await db.checklist.findUnique({ where: { id: item.checklistId }, select: { cardId: true } });
    if (cl?.cardId) {
      const boardId = await getBoardIdForCard(cl.cardId);
      if (boardId) revalidatePath(`/board/${boardId}`);
    }
  }
  return { ok: true };
}
