import type { CardType, FieldDef } from "../../../core/ipc";

interface Props {
  cardType: CardType;
  onChange: (cfg: CardType["card_frame"]) => void;
}

export function CardFrameEditor({ cardType, onChange }: Props) {
  const cfg = cardType.card_frame ?? { body: [] };
  const fields = cardType.fields.filter((f) => !f.deprecated);

  function set<K extends keyof NonNullable<CardType["card_frame"]>>(
    key: K,
    value: NonNullable<CardType["card_frame"]>[K],
  ) {
    onChange({ ...cfg, [key]: value });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          padding: 8,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          lineHeight: 1.5,
        }}
      >
        指定字段在卡框各区域显示。不填则自动猜测。
        <br />
        右侧检查器显示实时预览。
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="标题字段（留空用卡名）"
          value={cfg.title}
          onChange={(v) => set("title", v)}
          options={fields}
        />
        <FieldSelect
          label="副标题"
          value={cfg.subtitle}
          onChange={(v) => set("subtitle", v)}
          options={fields}
        />
        <FieldSelect
          label="类型行（留空用类型名）"
          value={cfg.type_line}
          onChange={(v) => set("type_line", v)}
          options={fields}
        />
        <FieldSelect
          label="图像字段"
          value={cfg.image}
          onChange={(v) => set("image", v)}
          options={fields.filter((f) => f.ty.kind === "image")}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="等级字段"
          value={cfg.level}
          onChange={(v) => set("level", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="等级显示名（留空用星号）"
          value={cfg.level_label ?? ""}
          onChange={(v) => set("level_label", v || null)}
          placeholder="例如：LV"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="攻击字段"
          value={cfg.atk}
          onChange={(v) => set("atk", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="攻击显示名（默认 ATK）"
          value={cfg.atk_label ?? ""}
          onChange={(v) => set("atk_label", v || null)}
          placeholder="例如：伤害"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="防御字段"
          value={cfg.def}
          onChange={(v) => set("def", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="防御显示名（默认 DEF）"
          value={cfg.def_label ?? ""}
          onChange={(v) => set("def_label", v || null)}
          placeholder="例如：价值"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <FieldSelect
          label="HP 字段"
          value={cfg.hp}
          onChange={(v) => set("hp", v)}
          options={fields.filter((f) => f.ty.kind === "number")}
        />
        <LabeledInput
          label="HP 显示名（默认 HP）"
          value={cfg.hp_label ?? ""}
          onChange={(v) => set("hp_label", v || null)}
          placeholder="例如：生命"
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginBottom: 4,
          }}
        >
          正文字段（可多选，按选择顺序显示）
        </div>
        <div
          style={{
            maxHeight: 160,
            overflow: "auto",
            border: "1px solid var(--border-subtle)",
            padding: 6,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
          }}
        >
          {fields.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: 4 }}>
              暂无字段
            </div>
          )}
          {fields.map((f) => {
            const checked = cfg.body.includes(f.key);
            return (
              <label
                key={f.key}
                style={{
                  display: "flex",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const body = e.target.checked
                      ? [...cfg.body, f.key]
                      : cfg.body.filter((k) => k !== f.key);
                    set("body", body);
                  }}
                  style={{ accentColor: "var(--accent-gold)" }}
                />
                {f.label}（{f.key}）
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-danger"
          onClick={() => onChange(null)}
          disabled={!cardType.card_frame}
          style={{ fontSize: 11 }}
        >
          清空映射
        </button>
      </div>
    </div>
  );
}

// ============ 模块级小组件（避免重渲染时卸载） ============

function FieldSelect({
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

function LabeledInput({
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
