import { ipc } from "../ipc";
import { applyTheme, resetTheme } from "../../lib/theme";
import { getBuiltinTheme, hasBuiltinTheme } from "../../themes/registry";

export async function applyProjectTheme() {
  try {
    const manifest = await ipc.loadManifest();
    const themeId = manifest.theme_id;

    if (themeId && hasBuiltinTheme(themeId)) {
      resetTheme();
      applyTheme(getBuiltinTheme(themeId).variables);
      return;
    }

    if (themeId) {
      const themes = await ipc.listThemes();
      const t = themes.find((x) => x.id === themeId);
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
