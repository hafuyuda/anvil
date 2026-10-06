import { anvilDark } from "./anvil-dark";
import { anvilLight } from "./anvil-light";
import { parchment } from "./parchment";
import { highContrast } from "./high-contrast";
import { slate } from "./slate";
import type { BuiltinTheme } from "./types";

export type { BuiltinTheme } from "./types";
export { isBuiltinThemeId } from "./types";

export const BUILTIN_THEMES: BuiltinTheme[] = [
  anvilDark,
  anvilLight,
  parchment,
  highContrast,
  slate,
];

export function findBuiltinTheme(
  id: string | null | undefined,
): BuiltinTheme | null {
  if (!id) return null;
  return BUILTIN_THEMES.find((t) => t.id === id) ?? null;
}
