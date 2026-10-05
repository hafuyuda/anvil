import { ipc, type Card, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDraft } from "../../hooks/useDraft";
import { FieldInput } from "../../components/FieldInput";
import { RelationsPanel } from "./RelationsPanel";
import { nowMs } from "../../lib/time";

interface Props {
  card: Card;
  cardType: CardType;
}

export function CardEditor({ card, cardType }: Props) {
  const updateCard = useProjectStore((s) => s.updateCard);
  const removeCard = useProjectStore((s) => s.removeCard);

  const { draft, dirty, update, commit } = useDraft(
    card,
    async (d): Promise<void> => {
      const next: Card = { ...d, updated_at: nowMs() };
      await ipc.saveCard(next);
      updateCard(next);
    },
    {
      undoLabel: "编辑卡牌",
      onDraftChange: (d) => {
        // 立即同步 store，让卡片墙 / 卡框立刻反映
        updateCard({ ...d, updated_at: nowMs() });
      },
    },
  );

  async function handleDelete() {
    if (!confirm(`确认删除卡牌「${card.name}」？此操作不可撤销。`)) return;
    try {
      await ipc.deleteCard(card.id);
      removeCard(card.id);
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  function setValue(key: string, value: unknown) {
    update({
      values: { ...draft.values, [key]: value },
      updated_at: nowMs(),
    });
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
          onChange={(e) =>
            update({ name: e.target.value, updated_at: nowMs() })
          }
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

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: dirty ? "#c80" : "#888" }}>
          {dirty ? "保存中…" : "已保存"}
        </span>
        <button
          onClick={commit}
          disabled={!dirty}
          style={{ fontSize: 11 }}
          title="立即保存"
        >
          保存
        </button>
        <button
          onClick={handleDelete}
          style={{ marginLeft: "auto", color: "#c33" }}
        >
          删除
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid #eee",
          paddingTop: 12,
          marginTop: 12,
        }}
      >
        <RelationsPanel card={card} />
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
