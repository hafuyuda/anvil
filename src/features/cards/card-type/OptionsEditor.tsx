export function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        选项
      </div>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 4 }}>
          <input
            className="input"
            value={o}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-ghost"
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
            style={{ color: "var(--danger)", padding: "2px 8px" }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="btn"
        onClick={() => onChange([...options, `选项${options.length + 1}`])}
        style={{ alignSelf: "flex-start", fontSize: 11 }}
      >
        + 选项
      </button>
    </div>
  );
}
