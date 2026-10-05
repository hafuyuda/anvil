import type { FieldDef, FieldType } from "../core/ipc";

interface Props {
  /** 旧调用方式：直接传 FieldDef */
  field?: FieldDef;
  /** 新调用方式：显式传类型。field 存在时可省略 */
  ty?: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
  /** 覆盖显示名 */
  label?: string;
  /** 覆盖必填标记 */
  required?: boolean;
}

export function FieldInput({
  field,
  ty,
  value,
  onChange,
  label,
  required,
}: Props) {
  const resolvedTy = ty ?? field?.ty;
  const resolvedLabel = label ?? field?.label;
  const resolvedRequired = required ?? field?.required ?? false;

  if (!resolvedTy) {
    return <span style={{ color: "#c33", fontSize: 11 }}>缺少字段类型</span>;
  }

  const inputStyle: React.CSSProperties = {
    padding: "4px 6px",
    fontSize: 12,
    border: "1px solid #ddd",
    borderRadius: 4,
    width: "100%",
    boxSizing: "border-box",
  };

  const wrapped = (node: React.ReactNode) => {
    if (!resolvedLabel) return node;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: 11, color: "#888" }}>
          {resolvedLabel}
          {resolvedRequired && <span style={{ color: "#c33" }}> *</span>}
        </label>
        {node}
      </div>
    );
  };

  switch (resolvedTy.kind) {
    case "text":
      return wrapped(
        <input
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "rich_text":
      return wrapped(
        <textarea
          style={{ ...inputStyle, minHeight: 100, fontFamily: "inherit" }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "number":
      return wrapped(
        <input
          type="number"
          style={inputStyle}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />,
      );

    case "bool":
      return wrapped(
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />,
      );

    case "date":
      return wrapped(
        <input
          type="date"
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "color":
      return wrapped(
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="color"
            value={(value as string) ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            style={inputStyle}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>,
      );

    case "enum":
      return wrapped(
        <select
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">—</option>
          {resolvedTy.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>,
      );

    case "multi_enum": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return wrapped(
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {resolvedTy.options.map((o) => (
            <label key={o} style={{ fontSize: 12, display: "flex", gap: 4 }}>
              <input
                type="checkbox"
                checked={arr.includes(o)}
                onChange={(e) => {
                  onChange(
                    e.target.checked ? [...arr, o] : arr.filter((x) => x !== o),
                  );
                }}
              />
              {o}
            </label>
          ))}
        </div>,
      );
    }

    case "tags": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return wrapped(
        <input
          style={inputStyle}
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="用逗号分隔"
        />,
      );
    }

    case "ref": {
      const arr = Array.isArray(value)
        ? (value as string[])
        : value
          ? [value as string]
          : [];
      return wrapped(
        <input
          style={inputStyle}
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="卡牌 ID，逗号分隔"
        />,
      );
    }

    case "image":
    case "url":
      return wrapped(
        <input
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            resolvedTy.kind === "image" ? "assets/..." : "https://..."
          }
        />,
      );

    case "json":
      return wrapped(
        <textarea
          style={{ ...inputStyle, minHeight: 80, fontFamily: "monospace" }}
          value={value === undefined ? "" : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(e.target.value ? JSON.parse(e.target.value) : null);
            } catch {
              // 忽略解析错误
            }
          }}
        />,
      );

    default:
      return <span style={{ color: "#c33", fontSize: 11 }}>未知字段类型</span>;
  }
}
