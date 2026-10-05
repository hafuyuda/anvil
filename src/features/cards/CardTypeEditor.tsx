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
    { undoLabel: "编辑卡牌类型", autoSave: false },
  );

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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        overflow: "auto",
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: "4px 8px",
            flex: 1,
          }}
        />
        <button onClick={addField}>加字段</button>
        <button onClick={commit} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
      </div>

      <input
        value={draft.description ?? ""}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="类型描述"
        style={{ padding: "4px 8px", fontSize: 12 }}
      />

      <CardFrameEditor
        cardType={draft}
        onChange={(card_frame) => update({ card_frame })}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visibleFields.length === 0 && (
          <p style={{ color: "#888", fontSize: 12 }}>还没有字段</p>
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
                      [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]];
                      update({
                        fields: fields.map((f, idx) => ({ ...f, order: idx })),
                      });
                    }
                  : undefined
              }
            />
          ),
        )}
      </div>

      {draft.fields.some((f) => f.deprecated) && (
        <details style={{ fontSize: 12, color: "#888" }}>
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
  );
}

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
    allowEmpty = true,
  }: {
    label: string;
    value: string | null | undefined;
    onChange: (v: string | null) => void;
    filter?: (f: FieldDef) => boolean;
    allowEmpty?: boolean;
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
        <span style={{ color: "#888" }}>{label}</span>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{ padding: "3px 6px" }}
        >
          {allowEmpty && <option value="">— 未指定 —</option>}
          {opts.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}（{f.key}）
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <details
      style={{
        border: "1px solid #eee",
        borderRadius: 4,
        padding: 8,
        background: "#fafafa",
      }}
    >
      <summary style={{ fontSize: 12, color: "#666", cursor: "pointer" }}>
        卡框映射（不填则自动猜测）
      </summary>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 8,
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
          label="等级"
          value={cfg.level}
          onChange={(v) => set("level", v)}
          filter={(f) => f.ty.kind === "number"}
        />
        <FieldSelect
          label="攻击 ATK"
          value={cfg.atk}
          onChange={(v) => set("atk", v)}
          filter={(f) => f.ty.kind === "number"}
        />
        <FieldSelect
          label="防御 DEF"
          value={cfg.def}
          onChange={(v) => set("def", v)}
          filter={(f) => f.ty.kind === "number"}
        />
        <FieldSelect
          label="HP"
          value={cfg.hp}
          onChange={(v) => set("hp", v)}
          filter={(f) => f.ty.kind === "number"}
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
          正文字段（可多选）
        </div>
        <div
          style={{
            maxHeight: 120,
            overflow: "auto",
            border: "1px solid #eee",
            padding: 4,
            borderRadius: 4,
            background: "#fff",
          }}
        >
          {fields.length === 0 && (
            <div style={{ fontSize: 12, color: "#aaa" }}>暂无字段</div>
          )}
          {fields.map((f) => {
            const checked = cfg.body.includes(f.key);
            return (
              <label
                key={f.key}
                style={{
                  display: "flex",
                  gap: 4,
                  fontSize: 12,
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
                />
                {f.label}（{f.key}）
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={() => onChange(null)}
          style={{ fontSize: 11 }}
          disabled={!cardType.card_frame}
        >
          清空映射
        </button>
      </div>
    </details>
  );
}
