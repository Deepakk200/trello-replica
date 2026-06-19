import { nanoid } from "nanoid";

// Pretty-URL helpers (prompt 03): boards/cards get a short public id + a slug
// derived from the title, used by /b/<shortId>/<slug> and /c/<shortId>/<slug>.

/** URL-safe slug from a title (lowercase, dashed, trimmed, capped). */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

/** Short, URL-friendly public id (8 chars). */
export function shortId(): string {
  return nanoid(8);
}

/**
 * Canonical in-app URL for a legacy (localStorage) board: `/b/<id>/<slug>`.
 * The id is the store's nanoid (the source of truth); the slug is cosmetic and
 * self-corrects via <BoardUrlSync/> after a board is renamed.
 */
export function boardPath(id: string, title: string): string {
  return `/b/${id}/${slugify(title)}`;
}
