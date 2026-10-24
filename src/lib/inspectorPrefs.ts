import { clamp } from "./math";

/**
 * 检查器的宽度与折叠偏好。
 *
 * 存在 localStorage，跨会话保留 —— 上次把宽度拖到多少、折叠没折叠，
 * 重开就是什么样。套路与 lib/moduleOrder.ts 一致：读的时候尽量容错
 * （脏数据、缺字段、JSON 坏了都退回默认值），写的时候静默失败
 * （隐私模式 / 配额满都不该让 UI 崩）。
 */

const KEY = "anvil.inspectorPrefs";

/** 与 uiSlice 里的钳制范围保持一致 */
export const MIN_INSPECTOR_WIDTH = 200;
export const MAX_INSPECTOR_WIDTH = 700;
export const DEFAULT_INSPECTOR_WIDTH = 320;

export interface InspectorPrefs {
  width: number;
  collapsed: boolean;
}

const DEFAULTS: InspectorPrefs = {
  width: DEFAULT_INSPECTOR_WIDTH,
  collapsed: false,
};

let cached: InspectorPrefs | null = null;

export function clampInspectorWidth(w: number): number {
  if (!Number.isFinite(w)) return DEFAULT_INSPECTOR_WIDTH;
  return clamp(w, MIN_INSPECTOR_WIDTH, MAX_INSPECTOR_WIDTH);
}

function readFromStorage(): InspectorPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return { ...DEFAULTS };

    const obj = parsed as Record<string, unknown>;
    const width =
      typeof obj.width === "number"
        ? clampInspectorWidth(obj.width)
        : DEFAULT_INSPECTOR_WIDTH;

    return {
      width,
      // collapsed 只认显式 true，其它一律当未折叠，避免脏数据把面板锁死
      collapsed: obj.collapsed === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function getInspectorPrefs(): InspectorPrefs {
  if (!cached) cached = readFromStorage();
  return cached;
}

/** 局部更新并存盘。调用方不必先读再写整份。 */
export function saveInspectorPrefs(patch: Partial<InspectorPrefs>): void {
  const next: InspectorPrefs = { ...getInspectorPrefs(), ...patch };
  next.width = clampInspectorWidth(next.width);
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 静默
  }
}

