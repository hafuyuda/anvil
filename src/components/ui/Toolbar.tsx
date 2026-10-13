import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 是否显示底部分隔线 */
  divider?: boolean;
}

export function Toolbar({ children, divider = true }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
        padding: "8px 12px",
        background: "var(--bg-panel)",
        borderBottom: divider ? "1px solid var(--border-subtle)" : "none",
        flexShrink: 0,
        minHeight: 44,
      }}
    >
      {children}
    </div>
  );
}

export function ToolbarSpacer() {
  return <div style={{ flex: 1 }} />;
}

export function ToolbarGroup({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        alignItems: "center",
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginRight: 2,
          }}
        >
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
