import type { CardType, FieldDef } from "../../../core/ipc";
import {
  CARD_ACCENT_PRESETS,
  CARD_FRAME_STYLE_LABELS,
  DEFAULT_CARD_FRAME_STYLE,
  isCardFrameStyle,
  type CardFrameStyle,
} from "../../../components/CardFrame";

interface Props {
  cardType: CardType;
  onChange: (cfg: CardType["card_frame"]) => void;
  onChangeColor: (color: string | null) => void;
}

const STYLE_OPTIONS: { value: CardFrameStyle; label: string }[] = (
  Object.keys(CARD_FRAME_STYLE_LABELS) as CardFrameStyle[]
).map((v) => ({ value: v, label: CARD_FRAME_STYLE_LABELS[v] }));

export function CardFrameEditor({ cardType, onChange, onChangeColor }: Props) {
  const cfg = cardType.card_frame ?? { body: [], foil_values: [] };
  const fields = cardType.fields.filter((f) => !f.deprecated);

  const styleValue: CardFrameStyle | null = isCardFrameStyle(cfg.style)
    ? cfg.style
    : null;

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

      {/* 卡框风格 */}
      <LabeledSelect
        label="卡框风格"
        value={styleValue}
        onChange={(v) => set("style", v)}
        options={STYLE_OPTIONS}
        placeholder={`默认（${CARD_FRAME_STYLE_LABELS[DEFAULT_CARD_FRAME_STYLE]}）`}
      />

      {/* 强调色 */}
      <AccentColorRow value={cardType.color ?? null} onChange={onChangeColor} />

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

      {/* 闪卡触发 */}
      <FoilTriggerRow
        cardType={cardType}
        fieldKey={cfg.foil_field ?? null}
        values={cfg.foil_values ?? []}
        onChange={(patch) => onChange({ ...cfg, ...patch })}
      />

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

function LabeledSelect({
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

function AccentColorRow({
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

function FoilTriggerRow({
  cardType,
  fieldKey,
  values,
  onChange,
}: {
  cardType: CardType;
  fieldKey: string | null;
  values: string[];
  onChange: (patch: {
    foil_field?: string | null;
    foil_values?: string[];
  }) => void;
}) {
  const fields = cardType.fields.filter((f) => !f.deprecated);

  const field = fieldKey ? fields.find((f) => f.key === fieldKey) : null;
  const fieldMissing = Boolean(fieldKey) && !field;

  const options: string[] | null =
    field && (field.ty.kind === "enum" || field.ty.kind === "multi_enum")
      ? field.ty.options
      : null;

  return (
    <div
      style={{
        padding: 10,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>闪卡触发</div>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          lineHeight: 1.5,
        }}
      >
        指定某字段命中某些值时，卡片呈现闪卡效果。
        <br />
        需视图层显式启用（卡片墙、检查器预览）。
      </div>

      {fields.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            padding: "6px 0",
            lineHeight: 1.5,
          }}
        >
          该类型暂无字段。先去「字段」tab 添加，再回来配置闪卡触发。
        </div>
      ) : (
        <>
          <label
            style={{
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ color: "var(--fg-muted)" }}>触发字段</span>
            <select
              className="select"
              value={fieldKey ?? ""}
              onChange={(e) => {
                const v = e.target.value || null;
                // 一次调用同时写两个字段，避免第二次覆盖第一次
                onChange({ foil_field: v, foil_values: [] });
              }}
            >
              <option value="">— 不启用 —</option>
              {fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}（{f.key}）
                </option>
              ))}
              {fieldMissing && fieldKey && (
                <option value={fieldKey}>（已失效：{fieldKey}）</option>
              )}
            </select>
          </label>

          {fieldKey && (
            <>
              {options ? (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      marginBottom: 4,
                    }}
                  >
                    触发值（勾选）
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {options.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                        该字段没有选项
                      </span>
                    )}
                    {options.map((o) => (
                      <label
                        key={o}
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
                          checked={values.includes(o)}
                          onChange={(e) => {
                            if (e.target.checked)
                              onChange({ foil_values: [...values, o] });
                            else
                              onChange({
                                foil_values: values.filter((x) => x !== o),
                              });
                          }}
                          style={{ accentColor: "var(--accent-gold)" }}
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <label
                  style={{
                    fontSize: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ color: "var(--fg-muted)" }}>
                    触发值（逗号分隔）
                  </span>
                  <input
                    className="input"
                    value={values.join(", ")}
                    onChange={(e) =>
                      onChange({
                        foil_values: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="例如：传说, 稀有"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                  />
                </label>
              )}

              {fieldMissing && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--warning)",
                    lineHeight: 1.5,
                  }}
                >
                  字段「{fieldKey}
                  」已失效（被删除或改名）。闪卡不会触发，可清空映射或改选其它字段。
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
