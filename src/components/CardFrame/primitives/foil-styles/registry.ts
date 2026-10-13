import type { FoilStyleDef } from "./types";

/** 未知 id / 旧数据缺省时回退的闪卡风格 */
export const DEFAULT_FOIL_STYLE = "gold";

// 自动发现：impl/ 下每个 .ts 默认导出一个 FoilStyleDef。
// 新增闪卡风格只加一个文件，无需改注册表或下拉。
const modules = import.meta.glob<{ default: FoilStyleDef }>("./impl/*.ts", {
  eager: true,
});

const styles = new Map<string, FoilStyleDef>();

for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id || !def.css) continue;
  styles.set(def.id, def);
}

let injected = false;

/**
 * 一次性把所有风格的 CSS 注入到 <head>。
 * 模块首次加载时执行，之后不再重复注入。
 */
function injectCssOnce() {
  if (injected) return;
  injected = true;

  for (const def of styles.values()) {
    const el = document.createElement("style");
    el.dataset.foilStyle = def.id;
    el.textContent = def.css;
    document.head.appendChild(el);
  }
}

injectCssOnce();

/** 按 id 查闪卡风格；未知 id（含 null/undefined）一律回退 gold。 */
export function getFoilStyle(id?: string | null): FoilStyleDef {
  if (id && styles.has(id)) return styles.get(id)!;
  return styles.get(DEFAULT_FOIL_STYLE)!;
}

/** 闪卡下拉的数据源。默认风格固定排第一，其余按 id 字母序。 */
export function listFoilStyles(): FoilStyleDef[] {
  const fallback = styles.get(DEFAULT_FOIL_STYLE);
  const rest = Array.from(styles.values())
    .filter((s) => s.id !== DEFAULT_FOIL_STYLE)
    .sort((a, b) => a.id.localeCompare(b.id));
  return fallback ? [fallback, ...rest] : rest;
}

/** 判断某个持久化值是不是已注册的闪卡风格 id。 */
export function hasFoilStyle(id: string): boolean {
  return styles.has(id);
}
