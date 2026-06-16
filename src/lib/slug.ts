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
