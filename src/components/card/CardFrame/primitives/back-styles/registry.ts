import { createStyleRegistry } from "../../../../../lib/styleRegistry";
import type { CardBackStyleDef } from "./types";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CardBackStyleDef。
// 新增卡背只加一个文件，无需改注册表或分派器。
const registry = createStyleRegistry<CardBackStyleDef>(
  import.meta.glob("./impl/*.tsx", { eager: true }),
  "anvil",
  {
    validate: (def): def is CardBackStyleDef => {
      const d = def as Partial<CardBackStyleDef> | null | undefined;
      return !!d?.id && !!d?.Component;
    },
  },
);

/** 未知 id / 旧数据缺省时回退的卡背 */
export const DEFAULT_CARD_BACK_STYLE = registry.defaultId;
/** 按 id 查卡背；未知 id（含 null/undefined）一律回退 anvil。 */
export const getCardBackStyle = registry.get;
/** 卡背下拉的数据源。默认风格固定排第一，其余按 id 字母序。 */
export const listCardBackStyles = registry.list;
/** 判断某个持久化值是不是已注册的卡背 id。 */
export const hasCardBackStyle = registry.has;
