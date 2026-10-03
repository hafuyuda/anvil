import { useState } from "react";
import {
  ipc,
  type CardType,
  type FieldDef,
  type FieldType,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";

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
  const [draft, setDraft] = useState<CardType>(cardType);
  const [dirty, setDirty] = useState(false);

  // 切换选中类型时重置草稿
  if (draft.id !== cardType.id) {
    setDraft(cardType);
    setDirty(false);
  }

  function update(patch: Partial<CardType>) {
    setDraft((d) => ({ ...d, ...patch, updated_at: Date.now() }));
    setDirty(true);
  }

  function updateField(index: number, patch: Partial<FieldDef>) {
    const fields = draft.fields.map((f, i) =>
      i === index ? { ...f, ...patch } : f,
    );
    update({ fields });
  }

  function addField() {
    const key = `field_${Date.now().toString(36)}`;
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

  async function save() {
    const visible = draft.fields.filter((f) => !f.deprecated);

    // key 非空
    if (visible.some((f) => !f.key.trim())) {
      alert("字段 key 不能为空");
      return;
    }
    // key 唯一
    const keys = visible.map((f) => f.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) {
      alert(`字段 key 重复：${dup}`);
      return;
    }
    // key 格式：字母数字下划线，字母开头
    const bad = visible.find((f) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.key));
    if (bad) {
      alert(
        `字段 key 格式不合法：${bad.key}（只允许字母、数字、下划线，字母开头）`,
      );
      return;
    }

    await ipc.upsertCardType(draft);
    upsertCardType(draft);
    setDirty(false);
  }

  const visibleFields = draft.fields.filter((f) => !f.deprecated);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          style={{ fontSize: 16, fontWeight: 600, padding: "4px 8px", flex: 1 }}
        />
        <button onClick={addField}>加字段</button>
        <button onClick={save} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
      </div>

      <input
        value={draft.description ?? ""}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="类型描述"
        style={{ padding: "4px 8px", fontSize: 12 }}
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
        border: "1px solid #eee",
        borderRadius: 4,
        background: "#fff",
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
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="显示名"
          style={{ padding: "4px 6px" }}
        />
        <input
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="key"
          style={{ padding: "4px 6px", fontFamily: "monospace" }}
        />
        <select
          value={field.ty.kind}
          onChange={(e) =>
            onChange({ ty: defaultFieldType(e.target.value as FieldType["kind"]) })
          }
          style={{ padding: "4px 6px" }}
        >
          {FIELD_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          必填
        </label>
        <button onClick={onMoveUp} disabled={!onMoveUp} title="上移">
          ↑
        </button>
        <button onClick={onRemove} title="删除">
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
        <RefTargetsEditor
          value={
            field.ty.kind === "ref" ? field.ty.target_types : []
          }
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
      <div style={{ fontSize: 11, color: "#888" }}>选项</div>
      {options.map((o, i) => (
        <div key={i} style={{ display: "flex", gap: 4 }}>
          <input
            value={o}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            style={{ flex: 1, padding: "3px 6px" }}
          />
          <button
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...options, `选项${options.length + 1}`])}
        style={{ alignSelf: "flex-start" }}
      >
        + 选项
      </button>
    </div>
  );
}

function RefTargetsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const cardTypes = useProjectStore((s) => s.cardTypes);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 11, color: "#888" }}>可引用类型</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cardTypes.map((t) => (
          <label
            key={t.id}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
          >
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, t.id]);
                else onChange(value.filter((x) => x !== t.id));
              }}
            />
            {t.name}
          </label>
        ))}
      </div>
    </div>
  );
}