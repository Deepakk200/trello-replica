// Tiny persisted store for template view-count increments (MODE LOCAL). The seed
// counts live in the dataset; this layers per-template local increments on top so
// "view count increments on detail open" persists across refresh. In MODE DB this
// becomes `incrementViewCount(id)` writing to the Template table.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TemplateViewsState {
  views: Record<string, number>;
  increment: (id: string) => void;
  extra: (id: string) => number;
}

export const useTemplateViews = create<TemplateViewsState>()(
  persist(
    (set, get) => ({
      views: {},
      increment: (id) => set((s) => ({ views: { ...s.views, [id]: (s.views[id] ?? 0) + 1 } })),
      extra: (id) => get().views[id] ?? 0,
    }),
    { name: "tc:template-views", storage: createJSONStorage(() => localStorage) },
  ),
);
