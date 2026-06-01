import { create } from 'zustand';

interface LabelExpansionStore {
  expanded: boolean;
  toggle: () => void;
}

export const useLabelExpansion = create<LabelExpansionStore>((set) => ({
  expanded: false,
  toggle: () => set((s) => ({ expanded: !s.expanded })),
}));
