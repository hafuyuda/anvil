import { CARD_ACCENT_PRESETS } from "../../../components/CardFrame";

export function AccentColorRow({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const isHex = typeof value === "string" && value.startsWith("#");
  const colorPickerValue =
    isHex && value.length >= 7 ? value.slice(0, 7) : "#a05a2c";

  const presetValue = CARD_ACCENT_PRESETS.some((p) => p.value === value)
    ? (value as string)
    : "";

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "var(--fg-muted)",
          marginBottom: 4,
        }}
      >
        强调色（标题栏、描边、选中环。留空跟随主题）
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="input"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="var(--accent-copper) 或 #a05a2c"
          style={{
            flex: 1,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        />
        <input
          type="color"
          value={colorPickerValue}
          onChange={(e) => onChange(e.target.value)}
          title="选色（写入 hex）"
          style={{
            width: 32,
            height: 24,
            padding: 0,
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <select
          className="select"
          value={presetValue}
          onChange={(e) => onChange(e.target.value || null)}
          title="从预设变量选择"
          style={{ width: 80, flexShrink: 0, fontSize: 12 }}
        >
          <option value="">预设…</option>
          {CARD_ACCENT_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}