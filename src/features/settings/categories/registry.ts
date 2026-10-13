import type { CategoryDef } from "./types";

export type { CategoryDef };

/**
 * settingsCategory 为 null / 未知 id 时的兜底分类。
 * 该分类不要求项目打开，保证任何时候都可渲染。
 */
export const DEFAULT_SETTINGS_CATEGORY = "appearance";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CategoryDef。
const modules = import.meta.glob<{ default: CategoryDef }>("./impl/*.tsx", {
  eager: true,
});

const categories = new Map<string, CategoryDef>();

for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id || !def.Panel) continue;
  categories.set(def.id, def);
}

/** 按 id 查分类；未知 id（含 null/undefined）回退默认分类。 */
export function getCategory(id?: string | null): CategoryDef {
  if (id && categories.has(id)) return categories.get(id)!;
  return categories.get(DEFAULT_SETTINGS_CATEGORY)!;
}

/** 左 NAV / 搜索数据源，按 order 升序。 */
export function listCategories(): CategoryDef[] {
  return Array.from(categories.values()).sort((a, b) => a.order - b.order);
}

/** 判断 id 是否为已注册分类。 */
export function hasCategory(id: string): boolean {
  return categories.has(id);
}
