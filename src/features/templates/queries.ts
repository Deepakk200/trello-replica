// Pure query helpers over the local template dataset (MODE LOCAL). When upgrading
// to MODE DB, replace these with `listTemplates`/`getTemplate` server actions of
// the same shape — callers (the gallery + detail) stay identical.
import { TEMPLATES, TEMPLATE_CATEGORIES, type GalleryTemplate, type TemplateCategory } from "@/data/templates";
import type { BoardTemplate } from "@/types";

export const FEATURED = "Featured" as const;
export const YOUR_TEMPLATES = "Your templates" as const;

/** Sidebar order: Featured first, then the canonical categories, then user templates. */
export const SIDEBAR_CATEGORIES = [FEATURED, ...TEMPLATE_CATEGORIES, YOUR_TEMPLATES] as const;
export type SidebarCategory = (typeof SIDEBAR_CATEGORIES)[number];

function matchesQuery(t: GalleryTemplate, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return t.title.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle);
}

/**
 * Filter the official templates by category + free-text query.
 * `category === "Featured"` → featured templates; `"Your templates"` is handled
 * by the caller (those come from the user's saved templates in the store).
 */
export function listTemplates(category: SidebarCategory = FEATURED, query = ""): GalleryTemplate[] {
  const q = query.trim();
  return TEMPLATES.filter((t) => {
    if (category === YOUR_TEMPLATES) return false;
    const inCategory = category === FEATURED ? !!t.featured : t.category === (category as TemplateCategory);
    return inCategory && matchesQuery(t, q);
  });
}

export function getTemplate(idOrSlug: string): GalleryTemplate | undefined {
  return TEMPLATES.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
}

/**
 * Map a store-saved BoardTemplate (from "Save board as template") into the
 * gallery shape so it renders under "Your templates" with the same UI. These get
 * an `id`-based slug and live under the synthesized category for display only.
 */
export function userTemplateToGallery(bt: BoardTemplate): GalleryTemplate {
  return {
    id: bt.id,
    slug: bt.id,
    title: bt.name,
    category: "Personal",
    description: bt.description || `Your saved template — ${bt.name}.`,
    previewColor: bt.background,
    author: "You",
    viewCount: 0,
    lists: bt.lists.map((l) => ({
      title: l.title,
      cards: l.cards.map((c) => ({ title: c.title, description: c.description })),
    })),
  };
}

/** Count per sidebar category (Featured + each category) for the badges. */
export function categoryCounts(): Record<string, number> {
  const counts: Record<string, number> = { [FEATURED]: 0 };
  for (const c of TEMPLATE_CATEGORIES) counts[c] = 0;
  for (const t of TEMPLATES) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
    if (t.featured) counts[FEATURED] += 1;
  }
  return counts;
}
