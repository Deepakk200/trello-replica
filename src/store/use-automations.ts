// Persisted automations store (MODE LOCAL). Rules + card/board buttons live here,
// scoped by boardId. In MODE DB this becomes the Automation table + server CRUD.
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { Automation } from "@/lib/automation/types";

interface AutomationsState {
  automations: Automation[];
  add: (a: Omit<Automation, "id" | "createdAt">) => string;
  update: (id: string, patch: Partial<Omit<Automation, "id" | "createdAt">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
}

export const useAutomations = create<AutomationsState>()(
  persist(
    (set) => ({
      automations: [],
      add: (a) => {
        const id = nanoid(8);
        set((s) => ({ automations: [...s.automations, { ...a, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
      remove: (id) => set((s) => ({ automations: s.automations.filter((a) => a.id !== id) })),
      toggle: (id) =>
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)) })),
    }),
    { name: "tc:automations", storage: createJSONStorage(() => localStorage) },
  ),
);
