type Variant = "section" | "block" | "field";

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  /** 覆盖默认值。一般不用 */
  style?: React.CSSProperties;
}

/** 尺寸走 index.css 的版式 token —— 改版式只改那一处，改配色只改主题。 */
const VARIANT_STYLES: Record<
  Variant,
  { fontSize: string; letterSpacing: number; marginBottom: string }
> = {
  section: {
    fontSize: "var(--fs-xs)",
    letterSpacing: 1,
    marginBottom: "var(--sp-2)",
  },
  block: {
    fontSize: "var(--fs-xs)",
    letterSpacing: 1,
    marginBottom: "var(--sp-4)",
  },
  field: {
    fontSize: "var(--fs-sm)",
    letterSpacing: 0.5,
    marginBottom: "var(--sp-2)",
  },
};

export function SectionLabel({ children, variant = "section", style }: Props) {
  const v = VARIANT_STYLES[variant];
  return (
    <div
      style={{
        fontSize: v.fontSize,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: v.letterSpacing,
        marginBottom: v.marginBottom,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
