import type { GridShapeDef } from "./types";

/** 未知 id / 旧数据缺省时回退的网格形状 */
export const DEFAULT_GRID_SHAPE = "square";

// 自动发现：shapes/ 下每个 .tsx 默认导出一个 GridShapeDef。
// 新增形状（六边形等）只加一个文件，下拉与绘制自动生效。
const modules = import.meta.glob<{ default: GridShapeDef }>("./shapes/*.tsx", {
  eager: true,
});

const shapes = new Map<string, GridShapeDef>();

for (const mod of Object.values(modules)) {
  const def = mod.default;
  if (!def?.id || !def.render) continue;
  shapes.set(def.id, def);
}

/** 按 id 查形状；未知 id（含 null/undefined）一律回退 square。 */
export function getGridShape(id?: string | null): GridShapeDef {
  if (id && shapes.has(id)) return shapes.get(id)!;
  return shapes.get(DEFAULT_GRID_SHAPE)!;
}

/** 切换器数据源，按 order 升序。 */
export function listGridShapes(): GridShapeDef[] {
  return Array.from(shapes.values()).sort((a, b) => a.order - b.order);
}

/** 判断某个持久化值是不是已注册的形状 id。 */
export function hasGridShape(id: string): boolean {
  return shapes.has(id);
}
