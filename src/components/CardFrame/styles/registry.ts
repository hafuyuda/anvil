import type { CardStyleDef } from "./types";

/** 未知 id / 旧数据缺省时回退的风格 */
export const DEFAULT_CARD_STYLE_ID = "yugioh";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CardStyleDef。
// 新增风格只加一个文件，无需改注册表或分派器。
const modules = import.meta.glob<{ default: CardStyleDef }>("./impl/*.tsx", {
  eager: true,
});

const defs = Object.values(modules).map((m) => m.default);

const byId = new Map<string, CardStyleDef>(defs.map((d) => [d.id, d]));

/** 按 id 查风格；未知 id（含 null/undefined）一律回退 yugioh。 */
export function getCardStyle(id: string | null | undefined): CardStyleDef {
  if (typeof id === "string") {
    const hit = byId.get(id);
    if (hit) return hit;
  }
  const fallback = byId.get(DEFAULT_CARD_STYLE_ID);
  if (!fallback) {
    throw new Error(`card style "${DEFAULT_CARD_STYLE_ID}" not registered`);
  }
  return fallback;
}

/** 判断某个持久化值是不是已注册的风格 id。 */
export function isCardStyleId(v: unknown): v is string {
  return typeof v === "string" && byId.has(v);
}

/**
 * 风格下拉的数据源。默认风格固定排第一，其余按 id 字母序，
 * 保证下拉顺序与历史版本一致（yugioh, generic, minimal, mtg, pokemon, …）。
 */
export function listCardStyles(): CardStyleDef[] {
  const fallback = byId.get(DEFAULT_CARD_STYLE_ID);
  const rest = defs
    .filter((d) => d.id !== DEFAULT_CARD_STYLE_ID)
    .sort((a, b) => a.id.localeCompare(b.id));
  return fallback ? [fallback, ...rest] : rest;
}
