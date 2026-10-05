import { create } from "zustand";

interface UIState {
  paletteOpen: boolean;
  mergePackOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openMergePack: () => void;
  closeMergePack: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  mergePackOpen: false,
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openMergePack: () => set({ mergePackOpen: true }),
  closeMergePack: () => set({ mergePackOpen: false }),
}));
