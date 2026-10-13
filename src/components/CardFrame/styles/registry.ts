import { createStyleRegistry } from "../../../lib/styleRegistry";
import type { CardStyleDef } from "./types";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CardStyleDef。
// 新增风格只加一个文件，无需改注册表或分派器。
const registry = createStyleRegistry<CardStyleDef>(
  import.meta.glob("./impl/*.tsx", { eager: true }),
  "yugioh",
);

/** 未知 id / 旧数据缺省时回退的风格 */
export const DEFAULT_CARD_STYLE_ID = registry.defaultId;
/** 按 id 查风格；未知 id（含 null/undefined）一律回退 yugioh。 */
export const getCardStyle = registry.get;
/** 风格下拉数据源：默认固定第一，其余按 id 字母序。 */
export const listCardStyles = registry.list;
/** 判断某个持久化值是不是已注册的风格 id。 */
export function isCardStyleId(v: unknown): v is string {
  return typeof v === "string" && registry.has(v);
}
