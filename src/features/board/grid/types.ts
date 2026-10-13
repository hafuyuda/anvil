import type { ReactNode } from "react";

/** 网格形状 render 的输入。 */
export interface GridShapeProps {
  /** 格子边长 */
  size: number;
  /** 棋盘可视宽 / 高（像素） */
  width: number;
  height: number;
  /** 网格偏移（当前 4 个内置形状不使用，保留给未来形状） */
  offsetX: number;
  offsetY: number;
}

/**
 * 一个棋盘网格形状的注册描述。
 * 新增形状只需在 `grid/shapes/` 下加一个 .tsx 并默认导出本对象。
 * render 返回 <svg> 内层节点（line / circle 等），外层 <svg> 由 GridLayer 统一提供。
 */
export interface GridShapeDef {
  /** 唯一 id，存进 GridConfig.shape */
  id: string;
  /** 切换下拉显示的名字 */
  label: string;
  /** 切换器顺序，小的在前 */
  order: number;
  /** 绘制 SVG 内层节点 */
  render: (props: GridShapeProps) => ReactNode;
}
