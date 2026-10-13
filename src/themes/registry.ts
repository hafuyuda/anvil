import { createStyleRegistry } from "../lib/styleRegistry";
import type { ThemeDef } from "./types";

export type { ThemeDef } from "./types";

// 自动发现：presets/ 下每个 .ts 默认导出一个 ThemeDef。
// 新增内置主题只加一个文件，下拉自动出现。
// 内置 id 均带 "builtin:" 前缀，与项目主题（uuid）区分。
const registry = createStyleRegistry<ThemeDef>(
  import.meta.glob("./presets/*.ts", { eager: true }),
  "builtin:anvil-dark",
  {
    validate: (def): def is ThemeDef => {
      const d = def as Partial<ThemeDef> | null | undefined;
      return !!d?.id && !!d?.name && !!d?.variables;
    },
  },
);

/** 未知 id / 旧数据缺省时回退的内置主题 */
export const DEFAULT_BUILTIN_THEME_ID = registry.defaultId;
/** 按 id 查内置主题；未知 id（含 null/undefined）回退默认 */
export const getBuiltinTheme = registry.get;
/** 内置主题列表：默认置顶，其余按 id 字母序 */
export const listBuiltinThemes = registry.list;
/** 判断 id 是否为已注册的内置主题 */
export const hasBuiltinTheme = registry.has;
