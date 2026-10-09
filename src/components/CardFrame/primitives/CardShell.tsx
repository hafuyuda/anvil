import type { CSSProperties, ReactNode } from "react";

interface Props {
  width: number;
  height: number;
  borderRadius: number;
  padding: number;
  background: string;
  border?: string;
  borderLeft?: string;
  /** 未选中时的阴影（CSS 值，通常是一个变量） */
  shadow?: string;
  /** 选中时的额外阴影，会自动加上双层 accent 外环 */
  shadowSelected?: string;
  /** 选中环的颜色 */
  accent: string;
  selected?: boolean;
  onClick?: () => void;
  /** 极少数风格需要的额外样式，慎用 */
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * 卡牌最外层容器。
 *
 * 统一处理：
 * - 尺寸 / 盒模型
 * - 选中态（外环 + 上浮）
 * - 过渡动画
 * - onClick 光标
 *
 * 选中环的公式对所有风格一致：
 *   0 0 0 2px var(--bg-panel), 0 0 0 4px {accent}, {shadowSelected}
 */
export function CardShell({
  width,
  height,
  borderRadius,
  padding,
  background,
  border,
  borderLeft,
  shadow,
  shadowSelected,
  accent,
  selected = false,
  onClick,
  style,
  children,
}: Props) {
  const selectedShadow = shadowSelected
    ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, ${shadowSelected}`
    : `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}`;

  return (
    <div
      onClick={onClick}
      style={{
        width,
        height,
        borderRadius,
        padding,
        boxSizing: "border-box",
        background,
        border,
        borderLeft,
        boxShadow: selected ? selectedShadow : shadow,
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
