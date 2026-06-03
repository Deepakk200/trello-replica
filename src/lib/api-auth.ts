// Validates Bearer-token API keys for programmatic access (keys minted in settings).
import { createHash } from "crypto";
import { db } from "@/lib/db";

export async function authenticateApiKey(
  authHeader: string | null
): Promise<{ userId: string; workspaceId: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7);
  const hash = createHash("sha256").update(raw).digest("hex");

  const apiKey = await db.apiKey.findFirst({
    where: {
      keyHash: hash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, userId: true, workspaceId: true },
  });
  if (!apiKey) return null;

  // Fire-and-forget lastUsedAt update.
  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { userId: apiKey.userId, workspaceId: apiKey.workspaceId };
}
