"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function search(rawQuery: unknown) {
  const user = await requireAuth();
  const { rateLimits, checkRateLimit } = await import("@/lib/rate-limit");
  try { await checkRateLimit(rateLimits.search, user.id); }
  catch (e) { if (e instanceof Error && e.message.startsWith("Rate limit")) throw e; }
  const query = z.string().min(1).max(200).parse(rawQuery);
  const workspaceId = user.workspaceId ?? "";

  // Build a prefix tsquery: each word becomes "word:*", AND-ed together.
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, "")) // strip tsquery operators from user input
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  if (!tsQuery) return { boards: [], cards: [], query };

  const boards = await db.$queryRaw<
    Array<{ id: string; title: string; background: string }>
  >`
    SELECT id, title, background
    FROM "Board"
    WHERE "workspaceId" = ${workspaceId}
      AND "deletedAt" IS NULL
      AND to_tsvector('english', title) @@ to_tsquery('english', ${tsQuery})
    LIMIT 5
  `;

  const cards = await db.$queryRaw<
    Array<{
      id: string;
      title: string;
      description: string | null;
      listId: string;
      boardId: string;
      boardTitle: string;
    }>
  >`
    SELECT c.id, c.title, c.description, c."listId",
           b.id AS "boardId", b.title AS "boardTitle"
    FROM "Card" c
    JOIN "List" l ON l.id = c."listId"
    JOIN "Board" b ON b.id = l."boardId"
    WHERE b."workspaceId" = ${workspaceId}
      AND c."deletedAt" IS NULL
      AND c."archived" = false
      AND to_tsvector('english', c.title || ' ' || coalesce(c.description, ''))
          @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(
      to_tsvector('english', c.title || ' ' || coalesce(c.description, '')),
      to_tsquery('english', ${tsQuery})
    ) DESC
    LIMIT 10
  `;

  return { boards, cards, query };
}
