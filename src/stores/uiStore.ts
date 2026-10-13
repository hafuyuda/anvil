import { create } from "zustand";

interface UIState {
  paletteOpen: boolean;
  mergePackOpen: boolean;
  settingsOpen: boolean;
  // 分类 id 由 features/settings/categories 注册表维护，未知 id 由设置页回退默认分类。
  settingsCategory: string | null;

  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  openMergePack: () => void;
  closeMergePack: () => void;
  openSettings: (category?: string) => void;
  closeSettings: () => void;
  setSettingsCategory: (c: string) => void;
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
