"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// Internal helper — called from other server actions, not directly from UI.
export async function recordActivity(input: {
  boardId?: string;
  cardId?: string;
  type: string;
  data: Record<string, unknown>;
}) {
  const session = await auth();
  if (!session?.user?.id) return; // best-effort
  try {
    await db.activity.create({
      data: {
        boardId: input.boardId ?? null,
        cardId: input.cardId ?? null,
        userId: session.user.id,
        type: input.type,
        data: input.data as object,
      },
    });
  } catch {
    // Never let activity recording break a mutation.
  }
}

export async function getCardActivity(cardId: string) {
  await requireAuth();
  return db.activity.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
}

export async function getBoardActivity(boardId: string) {
  await requireAuth();
  return db.activity.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      card: { select: { id: true, title: true } },
    },
  });
}
