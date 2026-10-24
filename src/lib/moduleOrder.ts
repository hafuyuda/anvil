import type { ModuleKey } from "../stores/projectStore";

const KEY = "anvil.leftNavOrder";

export const DEFAULT_MODULE_ORDER: ModuleKey[] = [
  "world",
  "docs",
  "story",
  "board",
  "cardGroups",
  "session",
  "player",
  "types",
];

let cached: ModuleKey[] | null = null;
const listeners = new Set<() => void>();

/**
 * 读 localStorage，过滤掉已不存在的模块，把缺失的模块按默认顺序追加到末尾。
 * 这样：老版本存过的顺序不会因新加/删模块而报错。
 */
function readFromStorage(): ModuleKey[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_MODULE_ORDER];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_MODULE_ORDER];

    const seen = new Set<ModuleKey>();
    const valid: ModuleKey[] = [];
    for (const k of parsed) {
      if (typeof k !== "string") continue;
      if (!DEFAULT_MODULE_ORDER.includes(k as ModuleKey)) continue;
      if (seen.has(k as ModuleKey)) continue;
      seen.add(k as ModuleKey);
      valid.push(k as ModuleKey);
    }
    for (const k of DEFAULT_MODULE_ORDER) {
      if (!seen.has(k)) valid.push(k);
    }
    return valid;
  } catch {
    return [...DEFAULT_MODULE_ORDER];
  }
}

export function getModuleOrder(): ModuleKey[] {
  if (!cached) cached = readFromStorage();
  return cached;
}

export function setModuleOrder(order: ModuleKey[]): void {
  cached = [...order];
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // 静默
  }
  notify();
}

export function resetModuleOrder(): void {
  cached = [...DEFAULT_MODULE_ORDER];
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 静默
  }
  notify();
}

export function subscribeModuleOrder(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}
