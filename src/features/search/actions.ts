"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { requireUser } from "@/lib/authz";

export type SearchResults = {
  query: string;
  boards: Array<{ id: string; title: string; background: string }>;
  cards: Array<{ id: string; title: string; description: string | null; listId: string; boardId: string; boardTitle: string }>;
  members: Array<{ id: string; name: string | null; email: string | null; avatarUrl: string | null }>;
};

/**
 * Global full-text search, scoped via RBAC to every board the user can access:
 * boards in any of their workspaces, boards shared with them directly, and public
 * boards. Cards/boards use the Postgres tsvector (GIN-indexed); members use ILIKE.
 */
export async function globalSearch(rawQuery: unknown): Promise<SearchResults> {
  const user = await requireUser();
  const { rateLimits, checkRateLimit } = await import("@/lib/rate-limit");
  try { await checkRateLimit(rateLimits.search, user.id); }
  catch (e) { if (e instanceof Error && e.message.startsWith("Rate limit")) throw e; }

  const query = z.string().min(1).max(200).parse(rawQuery);

  // Prefix tsquery: each sanitized word → "word:*", AND-ed.
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w]/g, "")) // strip tsquery operators from user input
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  const empty: SearchResults = { boards: [], cards: [], members: [], query };
  if (!tsQuery) return empty;

  // Every board the user is allowed to see (RBAC — no cross-user leakage).
  const accessible = await db.board.findMany({
    where: {
      deletedAt: null,
      OR: [
        { workspace: { members: { some: { userId: user.id } } } },
        { members: { some: { userId: user.id } } },
        { visibility: "public" },
      ],
    },
    select: { id: true },
  });
  const boardIds = accessible.map((b) => b.id);
  if (boardIds.length === 0) {
    // Still allow member search (workspace peers) even with no boards.
    return { ...empty, members: await searchMembers(user.id, query) };
  }

  const boards = await db.$queryRaw<
    Array<{ id: string; title: string; background: string }>
  >`
    SELECT id, title, background
    FROM "Board"
    WHERE id = ANY(${boardIds}::text[])
      AND "deletedAt" IS NULL
      AND to_tsvector('english', title) @@ to_tsquery('english', ${tsQuery})
    ORDER BY ts_rank(to_tsvector('english', title), to_tsquery('english', ${tsQuery})) DESC
    LIMIT 5
  `;

  const cards = await db.$queryRaw<
    Array<{ id: string; title: string; description: string | null; listId: string; boardId: string; boardTitle: string }>
  >`
    SELECT c.id, c.title, c.description, c."listId",
           b.id AS "boardId", b.title AS "boardTitle"
    FROM "Card" c
    JOIN "List" l ON l.id = c."listId"
    JOIN "Board" b ON b.id = l."boardId"
    WHERE b.id = ANY(${boardIds}::text[])
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

  return { boards, cards, members: await searchMembers(user.id, query), query };
}

/** Users who share a workspace with the caller and match name/email. */
async function searchMembers(userId: string, query: string) {
  return db.user.findMany({
    where: {
      deletedAt: null,
      workspaceMembers: { some: { workspace: { members: { some: { userId } } } } },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
    take: 5,
  });
}

/** Backward-compatible alias (older callers imported `search`). */
export async function search(rawQuery: unknown): Promise<SearchResults> {
  return globalSearch(rawQuery);
}
