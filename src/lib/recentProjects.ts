import { getAppSettings } from "./appSettings";

const KEY_LIST = "anvil.recentProjects";
const KEY_LAST = "anvil.lastOpenPath";

function maxItems(): number {
  const n = getAppSettings().recentProjectsMax;
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.floor(n);
}

function safeParse(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) {
      return arr.filter((x) => typeof x === "string");
    }
  } catch {
    // ignore
  }
  return [];
}

export function getRecentProjects(): string[] {
  return safeParse(localStorage.getItem(KEY_LIST));
}

export function addRecentProject(path: string): void {
  if (!path) return;
  const list = getRecentProjects().filter((p) => p !== path);
  list.unshift(path);
  localStorage.setItem(KEY_LIST, JSON.stringify(list.slice(0, maxItems())));
}

export function removeRecentProject(path: string): void {
  const list = getRecentProjects().filter((p) => p !== path);
  localStorage.setItem(KEY_LIST, JSON.stringify(list));
}

export function clearRecentProjects(): void {
  localStorage.removeItem(KEY_LIST);
}

export function getLastOpenPath(): string | null {
  const v = localStorage.getItem(KEY_LAST);
  return v && v.length > 0 ? v : null;
}

export function setLastOpenPath(path: string | null): void {
  if (path) {
    localStorage.setItem(KEY_LAST, path);
  } else {
    localStorage.removeItem(KEY_LAST);
  }
}
