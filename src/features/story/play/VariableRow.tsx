import type { VariableDef } from "../../../core/ipc";

interface Props {
  def: VariableDef;
  value: unknown;
  onChange: (v: unknown) => void;
}

export function VariableRow({ def, value, onChange }: Props) {
  const label = (
    <div
      style={{
        fontSize: 11,
        color: "var(--fg-secondary)",
        marginBottom: 3,
      }}
    >
      {def.label}
    </div>
  );

  if (def.ty.kind === "bool") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <label
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: 12,
            color: "var(--fg-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: "var(--accent-gold)" }}
          />
          {String(Boolean(value))}
        </label>
      </div>
    );
  }

  if (def.ty.kind === "number") {
    return (
      <div style={{ marginBottom: 6 }}>
        {label}
        <input
          className="input"
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 6 }}>
      {label}
      <input
        className="input"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
