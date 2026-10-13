interface Props {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** 默认 4 */
  gap?: number;
  disabled?: boolean;
}

/**
 * checkbox + label 组合。
 */
export function Toggle({ label, checked, onChange, gap = 4, disabled }: Props) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        gap,
        alignItems: "center",
        color: disabled ? "var(--fg-muted)" : "var(--fg-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ accentColor: "var(--accent-gold)" }}
      />
      {label}
    </label>
  );
}
