import type { CardBackStyleDef } from "./types";

/** 未知 id / 旧数据缺省时回退的卡背 */
export const DEFAULT_CARD_BACK_STYLE = "anvil";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CardBackStyleDef。
// 新增卡背只加一个文件，无需改注册表或分派器。
const modules = import.meta.glob<{ default: CardBackStyleDef }>(
  "./impl/*.tsx",
  { eager: true },
);

const styles = new Map<string, CardBackStyleDef>();

for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id || !def.Component) continue;
  styles.set(def.id, def);
}

/** 按 id 查卡背；未知 id（含 null/undefined）一律回退 anvil。 */
export function getCardBackStyle(id?: string | null): CardBackStyleDef {
  if (id && styles.has(id)) return styles.get(id)!;
  return styles.get(DEFAULT_CARD_BACK_STYLE)!;
}

/** 卡背下拉的数据源。默认风格固定排第一，其余按 id 字母序。 */
export function listCardBackStyles(): CardBackStyleDef[] {
  const fallback = styles.get(DEFAULT_CARD_BACK_STYLE);
  const rest = Array.from(styles.values())
    .filter((s) => s.id !== DEFAULT_CARD_BACK_STYLE)
    .sort((a, b) => a.id.localeCompare(b.id));
  return fallback ? [fallback, ...rest] : rest;
}

/** 判断某个持久化值是不是已注册的卡背 id。 */
export function hasCardBackStyle(id: string): boolean {
  return styles.has(id);
}
