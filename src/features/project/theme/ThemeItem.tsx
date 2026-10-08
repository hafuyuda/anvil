export function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ThemeItem({
  name,
  selected,
  onSelect,
  onDelete,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <li
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "4px 8px",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
        background: selected ? "var(--bg-raised)" : "transparent",
        borderLeft: selected
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        fontSize: 12,
      }}
    >
      <span style={{ flex: 1 }}>{name}</span>
      {onDelete && (
        <button
          className="btn btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            color: "var(--danger)",
            padding: "0 6px",
            fontSize: 12,
          }}
          title="删除"
        >
          ×
        </button>
      )}
    </li>
  );
}
