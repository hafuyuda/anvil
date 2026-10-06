import type { FieldDef, FieldType } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { TypeMultiSelect } from "../../../components/TypeMultiSelect";
import { FIELD_KINDS, defaultFieldType } from "./shared";
import { OptionsEditor } from "./OptionsEditor";

export interface FieldRowProps {
  field: FieldDef;
  handleProps: Record<string, unknown>;
  onChange: (patch: Partial<FieldDef>) => void;
  onRemove: () => void;
  isDragging?: boolean;
}

export function FieldRow({
  field,
  handleProps,
  onChange,
  onRemove,
  isDragging,
}: FieldRowProps) {
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];

  const needsOptions =
    field.ty.kind === "enum" || field.ty.kind === "multi_enum";
  const needsTargets = field.ty.kind === "ref";

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: 8,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.4)" : "none",
        transition: "box-shadow 0.12s",
      }}
    >
      <div
        {...handleProps}
        title="拖动排序"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--fg-muted)",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4px",
          fontSize: 13,
          letterSpacing: -2,
          flexShrink: 0,
          touchAction: "none",
        }}
      >
        ⋮⋮
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 140px auto auto",
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
    </div>
  );
}
