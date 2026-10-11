import { create } from "zustand";

export type SettingsCategory =
  "general" | "appearance" | "resources" | "editor" | "advanced";

interface UIState {
  paletteOpen: boolean;
  mergePackOpen: boolean;
  settingsOpen: boolean;
  settingsCategory: SettingsCategory | null;

  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openMergePack: () => void;
  closeMergePack: () => void;
  openSettings: (category?: SettingsCategory) => void;
  closeSettings: () => void;
  setSettingsCategory: (c: SettingsCategory) => void;
}

export const useUIStore = create<UIState>((set) => ({
  paletteOpen: false,
  mergePackOpen: false,
  settingsOpen: false,
  settingsCategory: null,

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openMergePack: () => set({ mergePackOpen: true }),
  closeMergePack: () => set({ mergePackOpen: false }),
  openSettings: (category) =>
    set({ settingsOpen: true, settingsCategory: category ?? null }),
  closeSettings: () => set({ settingsOpen: false, settingsCategory: null }),
  setSettingsCategory: (c) => set({ settingsCategory: c }),
}));
