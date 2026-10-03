import { useState } from "react";
import { ipc, type Card, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { FieldInput } from "./FieldInput";

interface Props {
  card: Card;
  cardType: CardType;
}

export function CardEditor({ card, cardType }: Props) {
  const updateCard = useProjectStore((s) => s.updateCard);
  const [draft, setDraft] = useState<Card>(card);
  const [dirty, setDirty] = useState(false);

  if (draft.id !== card.id) {
    setDraft(card);
    setDirty(false);
  }

  function setValue(key: string, value: unknown) {
    setDraft((d) => ({
      ...d,
      values: { ...d.values, [key]: value },
      updated_at: Date.now(),
    }));
    setDirty(true);
  }

  async function save() {
    await ipc.saveCard(draft);
    updateCard(draft);
    setDirty(false);
  }

  const visibleFields = cardType.fields
    .filter((f) => !f.deprecated)
    .sort((a, b) => a.order - b.order);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>名称</div>
        <input
          value={draft.name}
          onChange={(e) => {
            setDraft((d) => ({ ...d, name: e.target.value, updated_at: Date.now() }));
            setDirty(true);
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "4px 6px",
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid #ddd",
            borderRadius: 4,
          }}
        />
      </div>

      {visibleFields.length === 0 && (
        <p style={{ color: "#aaa", fontSize: 12 }}>
          该类型还没有字段，去「类型」里添加
        </p>
      )}

      {visibleFields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={draft.values[field.key]}
          onChange={(v) => setValue(field.key, v)}
        />
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={save} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
      </div>

      <details style={{ fontSize: 11, color: "#aaa" }}>
        <summary>原始数据</summary>
        <pre style={{ overflow: "auto", maxHeight: 200 }}>
          {JSON.stringify(draft, null, 2)}
        </pre>
      </details>
    </div>
  );
}