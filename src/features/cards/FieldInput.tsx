import type { FieldDef, FieldType } from "../../core/ipc";

interface Props {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldInput({ field, value, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: "#888" }}>
        {field.label}
        {field.required && <span style={{ color: "#c33" }}> *</span>}
      </label>
      <Control ty={field.ty} value={value} onChange={onChange} />
    </div>
  );
}

function Control({
  ty,
  value,
  onChange,
}: {
  ty: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputStyle: React.CSSProperties = {
    padding: "4px 6px",
    fontSize: 12,
    border: "1px solid #ddd",
    borderRadius: 4,
    width: "100%",
    boxSizing: "border-box",
  };

  switch (ty.kind) {
    case "text":
      return (
        <input
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "rich_text":
      return (
        <textarea
          style={{ ...inputStyle, minHeight: 100, fontFamily: "inherit" }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="支持 Markdown"
        />
      );

    case "number":
      return (
        <input
          type="number"
          style={inputStyle}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );

    case "bool":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );

    case "date":
      return (
        <input
          type="date"
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "color":
      return (
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
        </div>
      );

    case "enum":
      return (
        <select
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">—</option>
          {ty.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );

    case "multi_enum": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ty.options.map((o) => (
            <label key={o} style={{ fontSize: 12, display: "flex", gap: 4 }}>
              <input
                type="checkbox"
                checked={arr.includes(o)}
                onChange={(e) => {
                  onChange(
                    e.target.checked ? [...arr, o] : arr.filter((x) => x !== o)
                  );
                }}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }

    case "tags": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <input
          style={inputStyle}
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="用逗号分隔"
        />
      );
    }

    case "ref": {
      const arr = Array.isArray(value)
        ? (value as string[])
        : value
          ? [value as string]
          : [];
      return (
        <input
          style={inputStyle}
          value={arr.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="卡牌 ID，逗号分隔"
        />
      );
    }

    case "image":
    case "url":
      return (
        <input
          style={inputStyle}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={ty.kind === "image" ? "assets/..." : "https://..."}
        />
      );

    case "json":
      return (
        <textarea
          style={{ ...inputStyle, minHeight: 80, fontFamily: "monospace" }}
          value={value === undefined ? "" : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(e.target.value ? JSON.parse(e.target.value) : null);
            } catch {
              // 暂不处理解析错误
            }
          }}
        />
      );

    default:
      return <span style={{ color: "#c33", fontSize: 11 }}>未知字段类型</span>;
  }
}