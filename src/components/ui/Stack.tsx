import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 间距，走 --sp-* token 或数字（px） */
  gap?: number | string;
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  style?: CSSProperties;
  className?: string;
}

/**
 * 纵向堆叠容器。
 *
 * 为什么是组件而不是 CSS 类：审计发现 `display:flex, flexDirection:column,
 * gap:4` 出现 12 次、`gap:12` 出现 10 次 —— flex 容器几乎总带 gap，而 gap
 * 值有 4/6/8/12 四种。做成 .stack-gap-4 / .stack-gap-8 会排列组合爆炸，
 * 所以带参数的布局走组件，无参数的才走类（.grow / .fill / .muted）。
 *
 * minHeight: 0 是必需的 —— flex 子项默认 min-height:auto 不会收缩到内容以下，
 * 没有它，长列表会把父容器撑破而不是自己滚动。
 */
export function Stack({
  children,
  gap = "var(--sp-2)",
  align,
  justify,
  style,
  className,
}: Props) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 横向排列容器，默认垂直居中 —— 工具栏、行内信息最常见的形态 */
export function Row({
  children,
  gap = "var(--sp-2)",
  align = "center",
  justify,
  style,
  className,
}: Props) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: align,
        justifyContent: justify,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
