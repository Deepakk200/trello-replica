"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { recordAuditLog } from "./audit";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.workspaceId) throw new Error("No workspace");
  return session.user;
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createApiKey(rawName: unknown) {
  const user = await requireAuth();
  const name = z.string().min(1).max(100).parse(rawName);

  // tk_<64 hex>. The raw key is returned once and never stored.
  const raw = `tk_${randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 8);
  const hash = hashKey(raw);

  const apiKey = await db.apiKey.create({
    data: {
      workspaceId: user.workspaceId!,
      userId: user.id,
      name,
      keyHash: hash,
      keyPrefix: prefix,
    },
  });

  await recordAuditLog({ action: "apikey.created", resource: "ApiKey", resourceId: apiKey.id, metadata: { name } });

  return { ok: true as const, apiKey: { ...apiKey, rawKey: raw } };
}

export async function listApiKeys() {
  const user = await requireAuth();
  return db.apiKey.findMany({
    where: { workspaceId: user.workspaceId!, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });
}

export async function revokeApiKey(keyId: string) {
  const user = await requireAuth();
  // updateMany scopes by owner (update.where only allows unique fields).
  await db.apiKey.updateMany({
    where: { id: keyId, workspaceId: user.workspaceId! },
    data: { revokedAt: new Date() },
  });
  await recordAuditLog({ action: "apikey.revoked", resource: "ApiKey", resourceId: keyId, metadata: {} });
  return { ok: true as const };
}
