import type { GridConfig } from "../../core/ipc";

/** 棋盘画布内边距：board-bg 在内容坐标里的 left/top 偏移。 */
export const BOARD_PADDING = 16;

/** Token 默认尺寸（ Token 未显式设置 w/h 时使用）。 */
export const DEFAULT_TOKEN_W = 140;
export const DEFAULT_TOKEN_H = 205;

export const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
  shape: "square",
};
