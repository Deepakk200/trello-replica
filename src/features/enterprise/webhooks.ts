"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createHmac, randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.workspaceId) throw new Error("No workspace");
  return session.user;
}

const WebhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.string()).min(1),
});

export async function createWebhook(raw: unknown) {
  const user = await requireAuth();
  const data = WebhookSchema.parse(raw);
  const secret = randomBytes(32).toString("hex");
  const webhook = await db.webhook.create({
    data: { workspaceId: user.workspaceId!, url: data.url, events: data.events, secret },
  });
  return { ok: true as const, webhook, secret }; // secret shown once
}

export async function listWebhooks() {
  const user = await requireAuth();
  return db.webhook.findMany({
    where: { workspaceId: user.workspaceId!, active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, events: true, lastFiredAt: true, createdAt: true },
  });
}

export async function deleteWebhook(webhookId: string) {
  const user = await requireAuth();
  await db.webhook.updateMany({
    where: { id: webhookId, workspaceId: user.workspaceId! },
    data: { active: false },
  });
  return { ok: true as const };
}

// Internal — fire-and-forget delivery to all active webhooks for an event type.
export async function deliverWebhook(
  workspaceId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    const webhooks = await db.webhook.findMany({
      where: { workspaceId, active: true, events: { has: eventType } },
    });
    if (webhooks.length === 0) return;

    const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });

    await Promise.allSettled(
      webhooks.map(async (wh) => {
        const sig = createHmac("sha256", wh.secret).update(body).digest("hex");
        try {
          await fetch(wh.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Trello-Signature": sig,
              "X-Trello-Event": eventType,
            },
            body,
            signal: AbortSignal.timeout(5000),
          });
          await db.webhook.update({ where: { id: wh.id }, data: { lastFiredAt: new Date() } });
        } catch {
          logger.error("Webhook delivery failed", { url: wh.url, workspaceId });
        }
      })
    );
  } catch {
    // Never let webhook delivery break a mutation.
  }
}
