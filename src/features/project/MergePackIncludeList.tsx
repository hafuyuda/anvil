export function MergePackIncludeList({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 4,
        }}
      >
        {label}（{selected.length} / {items.length}）
      </div>
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: 6,
          background: "var(--bg-surface)",
          maxHeight: 120,
          overflowY: "auto",
        }}
      >
        {items.map((it) => (
          <label
            key={it.id}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              color: "var(--fg-secondary)",
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(it.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...selected, it.id]);
                else onChange(selected.filter((x) => x !== it.id));
              }}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            {it.name}
          </label>
        ))}
      </div>
    </div>
  );
}
