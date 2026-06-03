"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { CacheKeys, cacheGet, cacheSet, cacheDel } from "@/lib/redis";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

// Internal — called from createComment when an @mention is detected.
export async function createMentionNotification(input: {
  mentionedUserId: string;
  actorName: string;
  cardId: string;
  cardTitle: string;
  boardId: string;
  boardTitle: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: input.mentionedUserId,
        type: "mention",
        data: {
          cardId: input.cardId,
          cardTitle: input.cardTitle,
          boardId: input.boardId,
          boardTitle: input.boardTitle,
          actor: input.actorName,
          message: `${input.actorName} mentioned you in "${input.cardTitle}"`,
        },
      },
    });
    await cacheDel(CacheKeys.notifications(input.mentionedUserId));
  } catch {
    // best-effort
  }
}

// Unread count — cached in Redis for 30s (no-op cache falls through to DB).
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await requireAuth();
  const cacheKey = CacheKeys.notifications(user.id);

  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null) return cached;

  const count = await db.notification.count({
    where: { userId: user.id, read: false },
  });
  await cacheSet(cacheKey, count, 30);
  return count;
}

export async function getNotifications(page = 0, pageSize = 20) {
  const user = await requireAuth();
  return db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    skip: page * pageSize,
    take: pageSize,
  });
}

export async function markNotificationRead(notificationId: string) {
  const user = await requireAuth();
  // updateMany scopes by owner (update.where only allows unique fields).
  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
  await cacheDel(CacheKeys.notifications(user.id));
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();
  await db.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  await cacheDel(CacheKeys.notifications(user.id));
  return { ok: true };
}
