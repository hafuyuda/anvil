type Variant = "section" | "block" | "field";

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  /** 覆盖默认值。一般不用 */
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<
  Variant,
  { fontSize: number; letterSpacing: number; marginBottom: number }
> = {
  section: { fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  block: { fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  field: { fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
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
