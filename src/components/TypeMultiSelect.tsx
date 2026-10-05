interface TypeRef {
  id: string;
  name: string;
}

interface Props {
  label: string;
  allTypes: TypeRef[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function TypeMultiSelect({ label, allTypes, value, onChange }: Props) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {allTypes.length === 0 && (
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            暂无类型
          </span>
        )}
        {allTypes.map((t) => (
          <label
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--fg-secondary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, t.id]);
                else onChange(value.filter((x) => x !== t.id));
              }}
              style={{ accentColor: "var(--accent-gold)" }}
            />
            {t.name}
          </label>
        ))}
      </div>
    </div>
  );
}