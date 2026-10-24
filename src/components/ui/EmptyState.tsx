interface Props {
  children: React.ReactNode;
  /** 默认 var(--sp-12)。传数字按 px 处理 */
  padding?: number | string;
  /** 默认 var(--fs-md) */
  fontSize?: number | string;
  /** 默认 var(--lh-loose) */
  lineHeight?: number | string;
  /** 默认居中 */
  textAlign?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * 空状态占位。虚线框 + 弱色文字。
 *
 * 空态是最容易各写各的地方 —— 审计时发现 4 个文件一字不差地抄了同一份
 * 内联样式（padding:24 / dashed / fg-muted），却只有 2 处用了这个组件。
 * 空态要传达的是「这里本该有东西但现在没有」，视觉必须全站一致，
 * 否则用户分不清「没数据」和「渲染坏了」。
 */
export function EmptyState({
  children,
  padding = "var(--sp-12)",
  fontSize = "var(--fs-md)",
  lineHeight = "var(--lh-loose)",
  textAlign = "center",
  style,
}: Props) {
  return (
    <div
      style={{
        padding,
        textAlign,
        color: "var(--fg-muted)",
        fontSize,
        lineHeight,
        border: "1px dashed var(--border-default)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
