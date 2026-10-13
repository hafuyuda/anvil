import type { GridConfig } from "../../core/ipc";
import { getGridShape } from "./grid/registry";

interface Props {
  grid: GridConfig;
  width: number;
  height: number;
}

/**
 * 棋盘网格 SVG 层。
 * 形状由 grid/registry 分派（方格 / 点阵 / 横线 / 竖线 / 未来扩展），
 * 未知 shape 回退 square。
 */
export function GridLayer({ grid, width, height }: Props) {
  if (!grid.visible || grid.size <= 0) return null;

  const def = getGridShape(grid.shape);

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {def.render({
        size: grid.size,
        width,
        height,
        offsetX: grid.offset_x,
        offsetY: grid.offset_y,
      })}
    </svg>
  );
}
