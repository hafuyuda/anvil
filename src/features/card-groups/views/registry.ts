import type { CardGroupViewDef } from "./types";

/** 未知 id / 旧数据缺省时回退的卡组视图 */
export const DEFAULT_CARD_GROUP_VIEW = "grid";

// 自动发现：impl/ 下每个 .tsx 默认导出一个 CardGroupViewDef。
// 新增视图（时间线 / 紧凑列表等）只加一个文件，切换器自动出现。
const modules = import.meta.glob<{ default: CardGroupViewDef }>(
  "./impl/*.tsx",
  { eager: true },
);

const views = new Map<string, CardGroupViewDef>();

for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id || !def.Component) continue;
  views.set(def.id, def);
}

/** 按 id 查视图；未知 id（含 null/undefined）一律回退 grid。 */
export function getCardGroupView(id?: string | null): CardGroupViewDef {
  if (id && views.has(id)) return views.get(id)!;
  return views.get(DEFAULT_CARD_GROUP_VIEW)!;
}

/** 切换器数据源，按 order 升序。 */
export function listCardGroupViews(): CardGroupViewDef[] {
  return Array.from(views.values()).sort((a, b) => a.order - b.order);
}

/** 判断某个持久化值是不是已注册的视图 id。 */
export function hasCardGroupView(id: string): boolean {
  return views.has(id);
}
