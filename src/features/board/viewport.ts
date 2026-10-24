import type { Token } from "../../core/ipc";
import { DEFAULT_TOKEN_H, DEFAULT_TOKEN_W } from "./constants";

/**
 * 视口缓冲（屏幕 px）。滚动 / 平移时多渲染一圈，token 不会在边缘
 * 弹进弹出；缩放时按 zoom 换算成棋盘单位，所以缓冲的「屏幕手感」
 * 不随缩放变化。
 */
export const VIEWPORT_BUFFER_PX = 200;

/** 容器滚动度量——从 DOM 读出的四个值。抽成接口是为了纯函数可测。 */
export interface ScrollMetrics {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}

/** 棋盘坐标系下的可见矩形（已含缓冲）。 */
export interface BoardRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * 屏幕滚动度量 → 棋盘坐标可见矩形。
 *
 * 容器滚动的是「尺寸层」（board.width × zoom + padding×2），棋盘内容
 * 在 padding 之后并按 zoom 缩放，所以三个量都要抵消：
 * 屏幕像素 → 减 scroll → 减 padding → 除 zoom。
 */
export function visibleBoardRect(
  m: ScrollMetrics,
  zoom: number,
  padding: number,
): BoardRect {
  const z = zoom > 0 ? zoom : 1;
  const x0 = (m.scrollLeft - padding) / z;
  const y0 = (m.scrollTop - padding) / z;
  const x1 = (m.scrollLeft + m.clientWidth - padding) / z;
  const y1 = (m.scrollTop + m.clientHeight - padding) / z;
  const buf = VIEWPORT_BUFFER_PX / z;
  return { x0: x0 - buf, y0: y0 - buf, x1: x1 + buf, y1: y1 + buf };
}

/**
 * AABB 相交：token 外框与可见矩形有重叠即应渲染。
 * 部分相交也算——边缘上的 token 只露出一个角也要挂载，
 * 否则滚动过去会看到它「长」出来。
 */
export function tokenInView(t: Token, r: BoardRect): boolean {
  const w = t.w ?? DEFAULT_TOKEN_W;
  const h = t.h ?? DEFAULT_TOKEN_H;
  return t.x < r.x1 && t.x + w > r.x0 && t.y < r.y1 && t.y + h > r.y0;
}
