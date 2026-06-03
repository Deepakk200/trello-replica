"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { initialPosition } from "@/lib/position";
import { BOARD_TEMPLATES, type TemplateId } from "./template-defs";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.workspaceId) throw new Error("No workspace");
  return session.user;
}

export async function createBoardFromTemplate(templateId: TemplateId, customTitle?: string) {
  const user = await requireAuth();
  const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error("Template not found");

  const title = customTitle?.trim() || template.name;
  const last = await db.board.findFirst({ where: { workspaceId: user.workspaceId ?? "", deletedAt: null }, orderBy: { position: "desc" }, select: { position: true } });

  const board = await db.board.create({
    data: {
      title,
      background: template.background,
      workspaceId: user.workspaceId!,
      createdById: user.id,
      position: last ? last.position + 65536 : initialPosition(),
    },
  });

  for (let i = 0; i < template.lists.length; i++) {
    await db.list.create({ data: { boardId: board.id, title: template.lists[i], position: (i + 1) * 65536 } });
  }

  revalidatePath("/");
  return { ok: true, board };
}
