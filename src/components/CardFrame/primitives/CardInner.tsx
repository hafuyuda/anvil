import type { ReactNode } from "react";

interface Props {
  borderRadius: number;
  padding: number;
  background: string;
  border?: string;
  gap: number;
  children: ReactNode;
}

/**
 * 卡牌内层容器（标题 / 图像 / 正文的父级）。
 *
 * 统一处理：
 * - flex column + gap
 * - 定位上下文（`position: relative`，供出框、绝对定位子元素使用）
 * - 溢出裁切
 */
export function CardInner({
  borderRadius,
  padding,
  background,
  border,
  gap,
  children,
}: Props) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        borderRadius,
        background,
        border,
        padding,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
