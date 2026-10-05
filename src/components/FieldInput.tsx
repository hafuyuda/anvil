import type { FieldDef, FieldType } from "../core/ipc/ipc";
import { ImageField } from "./ImageField";

interface Props {
  field?: FieldDef;
  ty?: FieldType;
  value: unknown;
  onChange: (v: unknown) => void;
  label?: string;
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
    return (
      <span style={{ color: "var(--danger)", fontSize: 11 }}>缺少字段类型</span>
    );
  }

  const wrapped = (node: React.ReactNode) => {
    if (!resolvedLabel) return node;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {resolvedLabel}
          {resolvedRequired && (
            <span style={{ color: "var(--danger)" }}> *</span>
          )}
        </label>
        {node}
      </div>
    );
  };

  switch (resolvedTy.kind) {
    case "text":
      return wrapped(
        <input
          className="input"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "rich_text":
      return wrapped(
        <textarea
          className="textarea"
          style={{ minHeight: 100 }}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "number":
      return wrapped(
        <input
          className="input"
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />,
      );

    case "bool":
      return wrapped(
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
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
          {Boolean(value) ? "是" : "否"}
        </label>,
      );

    case "date":
      return wrapped(
        <input
          className="input"
          type="date"
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
            style={{
              width: 40,
              padding: 0,
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
            }}
          />
          <input
            className="input"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>,
      );

    case "enum":
      return wrapped(
        <select
          className="select"
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
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {resolvedTy.options.map((o) => (
            <label
              key={o}
              style={{
                fontSize: 12,
                display: "flex",
                gap: 6,
                alignItems: "center",
                color: "var(--fg-secondary)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={arr.includes(o)}
                onChange={(e) => {
                  onChange(
                    e.target.checked ? [...arr, o] : arr.filter((x) => x !== o),
                  );
                }}
                style={{ accentColor: "var(--accent-gold)" }}
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
          className="input"
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
          className="input"
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
      return wrapped(
        <ImageField
          value={value as string | null | undefined}
          onChange={onChange}
        />,
      );

    case "url":
      return wrapped(
        <input
          className="input"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />,
      );

    case "json":
      return wrapped(
        <textarea
          className="textarea"
          style={{ minHeight: 80, fontFamily: "var(--font-mono)" }}
          value={value === undefined ? "" : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(e.target.value ? JSON.parse(e.target.value) : null);
            } catch {
              // 忽略
            }
          }}
        />,
      );

    default:
      return (
        <span style={{ color: "var(--danger)", fontSize: 11 }}>
          未知字段类型
        </span>
      );
  }
}
