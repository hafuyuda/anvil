import { createStyleRegistry } from "../../../../../lib/styleRegistry";
import type { FoilStyleDef } from "./types";

// 自动发现：impl/ 下每个 .ts 默认导出一个 FoilStyleDef。
// 新增闪卡风格只加一个文件，无需改注册表或下拉。
// CSS 在模块首次加载时由 onReady 一次性注入 <head>。
const registry = createStyleRegistry<FoilStyleDef>(
  import.meta.glob("./impl/*.ts", { eager: true }),
  "gold",
  {
    validate: (def): def is FoilStyleDef => {
      const d = def as Partial<FoilStyleDef> | null | undefined;
      return !!d?.id && !!d?.css;
    },
    onReady: (styles) => {
      for (const def of styles.values()) {
        const el = document.createElement("style");
        el.dataset.foilStyle = def.id;
        el.textContent = def.css;
        document.head.appendChild(el);
      }
    },
  },
);

/** 未知 id / 旧数据缺省时回退的闪卡风格 */
export const DEFAULT_FOIL_STYLE = registry.defaultId;
/** 按 id 查闪卡风格；未知 id（含 null/undefined）一律回退 gold。 */
export const getFoilStyle = registry.get;
/** 闪卡下拉的数据源。默认风格固定排第一，其余按 id 字母序。 */
export const listFoilStyles = registry.list;
/** 判断某个持久化值是不是已注册的闪卡风格 id。 */
export const hasFoilStyle = registry.has;
