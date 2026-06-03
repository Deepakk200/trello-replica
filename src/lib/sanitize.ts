// Server-side HTML sanitisation for user-generated content.
// isomorphic-dompurify works in both Node (server actions) and browser.
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "ul", "ol", "li",
  "h1", "h2", "h3", "blockquote", "code", "pre", "a",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS, ALLOWED_ATTR, ADD_ATTR: ["target"], FORCE_BODY: true });
}

// Plain-text fields (titles, list names) — strips all HTML.
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
