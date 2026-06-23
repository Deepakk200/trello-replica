"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/authz";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getMyProfile() {
  const user = await requireUser();
  return db.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });
}

export async function updateMyProfile(raw: unknown) {
  const user = await requireUser();
  const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(raw);
  const { sanitizeText } = await import("@/lib/sanitize");
  await db.user.update({ where: { id: user.id }, data: { name: sanitizeText(name) } });
  revalidatePath("/account/profile");
  revalidatePath("/account/settings");
  return { ok: true };
}

// ─── Activity ────────────────────────────────────────────────────────────────

export async function getMyActivity() {
  const user = await requireUser();
  return db.activity.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true, type: true, data: true, createdAt: true,
      board: { select: { id: true, title: true } },
      card: { select: { id: true, title: true } },
    },
  });
}

// ─── Assigned cards ──────────────────────────────────────────────────────────

export async function getMyAssignedCards() {
  const user = await requireUser();
  const rows = await db.cardAssignee.findMany({
    where: { userId: user.id, card: { deletedAt: null, archived: false } },
    select: {
      card: {
        select: {
          id: true, title: true, dueDate: true, completed: true,
          list: { select: { title: true, board: { select: { id: true, title: true } } } },
        },
      },
    },
  });
  return rows
    .map((r) => r.card)
    .sort((a, b) => {
      // Due-dated first (soonest), then the rest.
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return a.title.localeCompare(b.title);
    });
}
