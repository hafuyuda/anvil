interface Props {
  children: React.ReactNode;
  /** 默认 24 */
  padding?: number;
  /** 默认 12 */
  fontSize?: number;
  /** 默认 1.6 */
  lineHeight?: number;
  /** 默认居中 */
  textAlign?: "left" | "center";
  style?: React.CSSProperties;
}

/**
 * 空状态占位。虚线框 + 弱色文字。
 */
export function EmptyState({
  children,
  padding = 24,
  fontSize = 12,
  lineHeight = 1.6,
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
