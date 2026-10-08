import type { FieldDef } from "../../../core/ipc";

export function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: FieldDef[];
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <select
        className="select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— 未指定 —</option>
        {options.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}（{f.key}）
          </option>
        ))}
      </select>
    </label>
  );
}

export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function LabeledSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>{label}</span>
      <select
        className="select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">— {placeholder} —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
