import type { FieldType, VariableDef } from "../../../core/ipc";
import { nowMs } from "../../../lib/time";

interface Props {
  variables: VariableDef[];
  onChange: (vars: VariableDef[]) => void;
}

const VAR_KINDS: { kind: FieldType["kind"]; label: string }[] = [
  { kind: "text", label: "文本" },
  { kind: "number", label: "数字" },
  { kind: "bool", label: "布尔" },
];

function defaultVarType(kind: FieldType["kind"]): FieldType {
  return { kind } as FieldType;
}

export function ScenarioVariablesEditor({ variables, onChange }: Props) {
  function addVariable() {
    const v: VariableDef = {
      key: `var_${nowMs().toString(36)}`,
      label: "新变量",
      ty: { kind: "text" },
      default: "",
    };
    onChange([...variables, v]);
  }

  function updateVariable(i: number, patch: Partial<VariableDef>) {
    onChange(variables.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function removeVariable(i: number) {
    onChange(variables.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          变量
        </div>
        <button
          className="btn"
          onClick={addVariable}
          style={{ fontSize: 11, padding: "2px 8px" }}
        >
          + 变量
        </button>
      </div>
      {variables.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
      )}
      {variables.map((v, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 100px 1fr auto",
            gap: 6,
            alignItems: "center",
            padding: "4px 0",
            fontSize: 12,
          }}
        >
          <input
            className="input"
            value={v.label}
            onChange={(e) => updateVariable(i, { label: e.target.value })}
            placeholder="显示名"
          />
          <input
            className="input"
            value={v.key}
            onChange={(e) => updateVariable(i, { key: e.target.value })}
            placeholder="key"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <select
            className="select"
            value={v.ty.kind}
            onChange={(e) =>
              updateVariable(i, {
                ty: defaultVarType(e.target.value as FieldType["kind"]),
              })
            }
          >
            {VAR_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
          <DefaultValueInput
            ty={v.ty}
            value={v.default}
            onChange={(value) => updateVariable(i, { default: value })}
          />
          <button
            className="btn btn-ghost"
            onClick={() => removeVariable(i)}
            style={{
              color: "var(--danger)",
              padding: "1px 6px",
              fontSize: 12,
            }}
            title="删除变量"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function DefaultValueInput({
  ty,
  value,
  onChange,
}: {
  ty: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (ty.kind === "bool") {
    return (
      <label
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
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "var(--accent-gold)" }}
        />
        默认
      </label>
    );
  }

  if (ty.kind === "number") {
    return (
      <input
        className="input"
        type="number"
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        placeholder="默认值"
      />
    );
  }

  return (
    <input
      className="input"
      value={(value as string) ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="默认值"
    />
  );
}
