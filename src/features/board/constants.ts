import type { GridConfig } from "../../core/ipc";

export const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
  shape: "square",
};

export const GRID_SHAPES: { value: string; label: string }[] = [
  { value: "square", label: "方格" },
  { value: "dots", label: "点阵" },
  { value: "horizontal", label: "横线" },
  { value: "vertical", label: "竖线" },
];
