import { ipc } from "./ipc";
import { applyTheme, resetTheme } from "../lib/theme";

export async function applyProjectTheme() {
  try {
    const manifest = await ipc.loadManifest();
    if (manifest.theme_id) {
      const themes = await ipc.listThemes();
      const t = themes.find((x) => x.id === manifest.theme_id);
      if (t) {
        resetTheme();
        applyTheme(t.variables);
        return;
      }
    }
    resetTheme();
  } catch {
    resetTheme();
  }
}
