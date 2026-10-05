import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import {
  ipc,
  type CardType,
  type FieldDef,
  type FieldType,
} from "../../core/ipc";
import { useDraft } from "../../hooks/useDraft";
import { TypeMultiSelect } from "../../components/TypeMultiSelect";
import { nowMs } from "../../lib/time";

interface Props {
  cardType: CardType;
}

const FIELD_KINDS: { kind: FieldType["kind"]; label: string }[] = [
  { kind: "text", label: "文本" },
  { kind: "rich_text", label: "富文本" },
  { kind: "number", label: "数字" },
  { kind: "bool", label: "布尔" },
  { kind: "date", label: "日期" },
  { kind: "color", label: "颜色" },
  { kind: "enum", label: "枚举" },
  { kind: "multi_enum", label: "多选枚举" },
  { kind: "tags", label: "标签" },
  { kind: "ref", label: "引用" },
  { kind: "image", label: "图片" },
  { kind: "url", label: "URL" },
  { kind: "json", label: "JSON" },
];

function defaultFieldType(kind: FieldType["kind"]): FieldType {
  switch (kind) {
    case "enum":
      return { kind: "enum", options: [] };
    case "multi_enum":
      return { kind: "multi_enum", options: [] };
    case "ref":
      return { kind: "ref", target_types: [] };
    default:
      return { kind } as FieldType;
  }
}

export function CardTypeEditor({ cardType }: Props) {
  const upsertCardType = useProjectStore((s) => s.upsertCardType);

  const { draft, dirty, update, commit } = useDraft(
    cardType,
    async (d): Promise<void | boolean> => {
      const visible = d.fields.filter((f) => !f.deprecated);

      if (visible.some((f) => !f.key.trim())) {
        alert("字段 key 不能为空");
        return false;
      }
      const keys = visible.map((f) => f.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) {
        alert(`字段 key 重复：${dup}`);
        return false;
      }
      const bad = visible.find((f) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.key));
      if (bad) {
        alert(
          `字段 key 格式不合法：${bad.key}（只允许字母、数字、下划线，字母开头）`,
        );
        return false;
      }

      const next: CardType = { ...d, updated_at: nowMs() };
      await ipc.upsertCardType(next);
      upsertCardType(next);
    },
    {
      undoLabel: "编辑卡牌类型",
      autoSave: false,
      onDraftChange: (d) => {
        upsertCardType({ ...d, updated_at: nowMs() });
      },
    },
  );

  const [tab, setTab] = useState<"fields" | "frame">("fields");

  function updateField(index: number, patch: Partial<FieldDef>) {
    const fields = draft.fields.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    update({ fields });
  }

  function addField() {
    const key = `field_${nowMs().toString(36)}`;
    const field: FieldDef = {
      key,
      label: "新字段",
      ty: { kind: "text" },
      required: false,
      order: draft.fields.length,
      deprecated: false,
    };
    update({ fields: [...draft.fields, field] });
  }

  function removeField(index: number) {
    if (!confirm("确认删除该字段？已有数据会保留但不显示。")) return;
    update({
      fields: draft.fields.map((f, i) =>
        i === index ? { ...f, deprecated: true } : f,
      ),
    });
  }

  const visibleFields = draft.fields.filter((f) => !f.deprecated);
  const hasFrame = Boolean(draft.card_frame);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶部：名称 + 保存状态 */}
      <div
        style={{
          padding: 12,
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          className="input"
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: "var(--font-title)",
            fontWeight: 600,
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {dirty ? "有未保存修改" : "已保存"}
        </span>
        <button className="btn" onClick={commit} disabled={!dirty}>
          保存
        </button>
      </div>

      {/* tab */}
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <TabButton active={tab === "fields"} onClick={() => setTab("fields")}>
          字段（{visibleFields.length}）
        </TabButton>
        <TabButton active={tab === "frame"} onClick={() => setTab("frame")}>
          卡框
          {hasFrame && (
            <span
              style={{
                marginLeft: 4,
                color: "var(--accent-gold)",
                fontSize: 10,
              }}
            >
              ●
            </span>
          )}
        </TabButton>
      </div>

      {/* tab 内容 */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
        {tab === "fields" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                描述
              </div>
              <input
                className="input"
                value={draft.description ?? ""}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="类型描述"
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--fg-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                字段
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {visibleFields.length === 0 && (
                  <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>
                    还没有字段
                  </p>
                )}
                {draft.fields.map((field, i) =>
                  field.deprecated ? null : (
                    <FieldRow
                      key={field.key}
                      field={field}
                      onChange={(patch) => updateField(i, patch)}
                      onRemove={() => removeField(i)}
                      onMoveUp={
                        i > 0
                          ? () => {
                              const fields = [...draft.fields];
                              [fields[i - 1], fields[i]] = [
                                fields[i],
                                fields[i - 1],
                              ];
                              update({
                                fields: fields.map((f, idx) => ({
                                  ...f,
                                  order: idx,
                                })),
                              });
                            }
                          : undefined
                      }
                    />
                  ),
                )}
              </div>

              <button
                className="btn"
                onClick={addField}
                style={{ marginTop: 8, fontSize: 12 }}
              >
                + 加字段
              </button>
            </div>

            {draft.fields.some((f) => f.deprecated) && (
              <details style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                <summary>已废弃字段（数据保留）</summary>
                <ul>
                  {draft.fields
                    .filter((f) => f.deprecated)
                    .map((f) => (
                      <li key={f.key}>
                        {f.label}（{f.key}）
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {tab === "frame" && (
          <CardFrameEditor
            cardType={draft}
            onChange={(card_frame) => update({ card_frame })}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
      }}
    >
      {children}
    </button>
  );
}

// ============ 字段行 ============

interface FieldRowProps {
  field: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
}

function FieldRow({ field, onChange, onRemove, onMoveUp }: FieldRowProps) {
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];

  const needsOptions =
    field.ty.kind === "enum" || field.ty.kind === "multi_enum";
  const needsTargets = field.ty.kind === "ref";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 8,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        fontSize: 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 140px auto auto auto",
          gap: 6,
          alignItems: "center",
        }}
      >
        <input
          className="input"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="显示名"
        />
        <input
          className="input"
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="key"
          style={{ fontFamily: "var(--font-mono)" }}
        />
        <select
          className="select"
          value={field.ty.kind}
          onChange={(e) =>
            onChange({
              ty: defaultFieldType(e.target.value as FieldType["kind"]),
            })
          }
        >
          {FIELD_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--fg-secondary)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            style={{ accentColor: "var(--accent-gold)" }}
          />
          必填
        </label>
        <button
          className="btn btn-ghost"
          onClick={onMoveUp}
          disabled={!onMoveUp}
          title="上移"
          style={{ padding: "2px 8px" }}
        >
          ↑
        </button>
        <button
          className="btn btn-ghost"
          onClick={onRemove}
          title="删除"
          style={{ padding: "2px 8px", color: "var(--danger)" }}
        >
          ×
        </button>
      </div>

      {needsOptions && (
        <OptionsEditor
          options={
            field.ty.kind === "enum" || field.ty.kind === "multi_enum"
              ? field.ty.options
              : []
          }
          onChange={(options) =>
            onChange({
              ty:
                field.ty.kind === "enum"
                  ? { kind: "enum", options }
                  : { kind: "multi_enum", options },
            })
          }
        />
      )}

      {needsTargets && (
        <TypeMultiSelect
          label="可引用类型"
          allTypes={cardTypes.map((t) => ({ id: t.id, name: t.name }))}
          value={field.ty.kind === "ref" ? field.ty.target_types : []}
          onChange={(target_types) =>
            onChange({ ty: { kind: "ref", target_types } })
          }
        />
      )}
    </div>
  );
}

function OptionsEditor({
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

// ============ 卡框编辑 ============

function CardFrameEditor({
  cardType,
  onChange,
}: {
  cardType: CardType;
  onChange: (cfg: CardType["card_frame"]) => void;
}) {
  const cfg = cardType.card_frame ?? { body: [] };
  const fields = cardType.fields.filter((f) => !f.deprecated);

  function set<K extends keyof NonNullable<CardType["card_frame"]>>(
    key: K,
    value: NonNullable<CardType["card_frame"]>[K],
  ) {
    onChange({ ...cfg, [key]: value });
  }

  function FieldSelect({
    label,
    value,
    onChange,
    filter,
  }: {
    label: string;
    value: string | null | undefined;
    onChange: (v: string | null) => void;
    filter?: (f: FieldDef) => boolean;
  }) {
    const opts = filter ? fields.filter(filter) : fields;
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
          {opts.map((f) => (
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

      {/* 基础字段 */}
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
        />
        <FieldSelect
          label="副标题"
          value={cfg.subtitle}
          onChange={(v) => set("subtitle", v)}
        />
        <FieldSelect
          label="类型行（留空用类型名）"
          value={cfg.type_line}
          onChange={(v) => set("type_line", v)}
        />
        <FieldSelect
          label="图像字段"
          value={cfg.image}
          onChange={(v) => set("image", v)}
          filter={(f) => f.ty.kind === "image"}
        />
      </div>

      {/* 等级 */}
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
          filter={(f) => f.ty.kind === "number"}
        />
        <LabeledInput
          label="等级显示名（留空用星号）"
          value={cfg.level_label ?? ""}
          onChange={(v) => set("level_label", v || null)}
          placeholder="例如：LV"
        />
      </div>

      {/* 攻击 */}
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
          filter={(f) => f.ty.kind === "number"}
        />
        <LabeledInput
          label="攻击显示名（默认 ATK）"
          value={cfg.atk_label ?? ""}
          onChange={(v) => set("atk_label", v || null)}
          placeholder="例如：伤害"
        />
      </div>

      {/* 防御 */}
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
          filter={(f) => f.ty.kind === "number"}
        />
        <LabeledInput
          label="防御显示名（默认 DEF）"
          value={cfg.def_label ?? ""}
          onChange={(v) => set("def_label", v || null)}
          placeholder="例如：价值"
        />
      </div>

      {/* HP */}
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
          filter={(f) => f.ty.kind === "number"}
        />
        <LabeledInput
          label="HP 显示名（默认 HP）"
          value={cfg.hp_label ?? ""}
          onChange={(v) => set("hp_label", v || null)}
          placeholder="例如：生命"
        />
      </div>

      {/* 正文字段 */}
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
