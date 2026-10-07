import type { CardFrameStyle } from "../components/CardFrame/types";

const KEY = "anvil.appSettings";

export interface AppSettings {
  defaultCardFrameStyle: CardFrameStyle;
  typewriterSpeed: number;
  typewriterEnabled: boolean;
  typewriterNarration: boolean;
  autoSaveDelayMs: number;
  recentProjectsMax: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultCardFrameStyle: "yugioh",
  typewriterSpeed: 35,
  typewriterEnabled: true,
  typewriterNarration: false,
  autoSaveDelayMs: 800,
  recentProjectsMax: 10,
};

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function readFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function getAppSettings(): AppSettings {
  if (!cached) cached = readFromStorage();
  return cached;
}

function notify() {
  for (const fn of listeners) fn();
}

export function setAppSettings(patch: Partial<AppSettings>): void {
  const next = { ...getAppSettings(), ...patch };
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用时静默，内存内仍生效
  }
  notify();
}

export function resetAppSettings(): void {
  cached = { ...DEFAULT_APP_SETTINGS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 同上
  }
  notify();
}

export function subscribeAppSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
