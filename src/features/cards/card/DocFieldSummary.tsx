import { useMemo } from "react";
import type { Card, CardType, FieldDef } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";

/** 速览最多显示的行数，超出折叠为「还有 N 个字段」。 */
const MAX_ROWS = 6;
/** 单值截断长度（字符）。 */
const MAX_VALUE_LEN = 60;

/**
 * 把字段值格式化为一行可读文本。空值返回 null（速览不占位）。
 *
 * 只读展示用：与 FieldInput 的编辑态分离，不承担校验职责。
 * ref 字段把卡 id 解析为卡名；解析不到（引用已失效）明确标注，
 * 不把 uuid 丢给用户看。
 */
export function formatFieldValue(
  field: FieldDef,
  value: unknown,
  cardNames: Map<string, string>,
): string | null {
  if (value === null || value === undefined) return null;

  switch (field.ty.kind) {
    case "text":
    case "rich_text":
    case "url":
    case "date": {
      if (typeof value !== "string") return null;
      const line = oneLine(value);
      return line ? truncate(line) : null;
    }
    case "number": {
      if (typeof value !== "number") return null;
      return String(value);
    }
    case "bool":
      return value ? "是" : "否";
    case "color": {
      if (typeof value !== "string" || !value) return null;
      return truncate(value);
    }
    case "enum": {
      if (typeof value !== "string" || !value) return null;
      return truncate(value);
    }
    case "multi_enum":
    case "tags": {
      if (!Array.isArray(value) || value.length === 0) return null;
      return truncate(value.map((v) => String(v)).join("、"));
    }
    case "ref": {
      if (typeof value !== "string" || !value) return null;
      const name = cardNames.get(value);
      return truncate(name ?? "（引用已失效）");
    }
    case "image": {
      if (typeof value !== "string" || !value) return null;
      const name = value.split(/[\\/]/).pop() ?? value;
      return truncate(name);
    }
    case "json": {
      const s = JSON.stringify(value);
      return s ? truncate(s) : null;
    }
  }
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function truncate(s: string): string {
  return s.length > MAX_VALUE_LEN ? `${s.slice(0, MAX_VALUE_LEN)}…` : s;
}

interface Row {
  field: FieldDef;
  text: string;
}

/**
 * 文档 tab 顶部的字段速览：把该卡已设置的字段值压缩成只读几行，
 * 作者写长文时不必切回字段 tab 核对数值。
 *
 * 刻意只读：这里是「看一眼」的地方，不是「改一改」的地方——
 * 编辑仍归字段 tab，数据仍归 Card.values。
 */
export function DocFieldSummary({
  card,
  cardType,
}: {
  card: Card;
  cardType: CardType | null | undefined;
}) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardNames = useMemo(
    () => new Map(cards.map((c) => [c.id, c.name])),
    [cards],
  );

  const rows = useMemo<Row[]>(() => {
    if (!cardType) return [];
    const fields = cardType.fields
      .filter((f) => !f.deprecated)
      .sort((a, b) => a.order - b.order);
    const out: Row[] = [];
    for (const f of fields) {
      const text = formatFieldValue(f, card.values[f.key], cardNames);
      if (text === null) continue;
      out.push({ field: f, text });
    }
    return out;
  }, [cardType, card.values, cardNames]);

  if (rows.length === 0) return null;

  const shown = rows.slice(0, MAX_ROWS);
  const rest = rows.length - shown.length;

  return (
    <div
      style={{
        flexShrink: 0,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          字段速览
        </span>
        <span style={{ fontSize: 10, color: "var(--fg-muted)" }}>只读</span>
      </div>

      {shown.map(({ field, text }) => (
        <div
          key={field.key}
          title={`${field.label}：${text}`}
          style={{
            display: "grid",
            gridTemplateColumns: "64px 1fr",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            lineHeight: 1.5,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: "var(--fg-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {field.label}
          </span>
          <span
            style={{
              color: "var(--fg-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        </div>
      ))}

      {rest > 0 && (
        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          还有 {rest} 个字段…
        </div>
      )}
    </div>
  );
}
