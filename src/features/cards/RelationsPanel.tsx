import { useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type RelationKind,
} from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { RelationForm } from "./RelationForm";

interface Props {
  card: Card;
}

export function RelationsPanel({ card }: Props) {
  const relations = useProjectStore((s) => s.relations) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const removeRelation = useProjectStore((s) => s.removeRelation);
  const selectCard = useProjectStore((s) => s.selectCard);

  const [adding, setAdding] = useState(false);

  const outgoing = relations.filter((r) => r.from === card.id);
  const incoming = relations.filter((r) => r.to === card.id);

  const cardName = (id: string) =>
    cards.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  const kindOf = (id: string): RelationKind | undefined =>
    relationKinds.find((k) => k.id === id);

  async function handleDelete(r: Relation) {
    if (!confirm("确认删除这条关系？")) return;
    try {
      await ipc.deleteRelation(r.from, r.id);
      removeRelation(r.id);
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
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
            出边（{outgoing.length}）
          </div>
          {!adding && (
            <button
              className="btn btn-ghost"
              onClick={() => setAdding(true)}
              style={{ fontSize: 11, padding: "2px 6px" }}
            >
              + 添加
            </button>
          )}
        </div>

        {adding && (
          <RelationForm
            fromCardId={card.id}
            fromTypeId={card.type_id}
            onDone={() => setAdding(false)}
          />
        )}

        {outgoing.length === 0 && !adding && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
        )}

        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {outgoing.map((r) => {
            const k = kindOf(r.kind);
            return (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  fontSize: 12,
                }}
              >
                <span style={{ color: k?.color ?? "var(--fg-secondary)" }}>
                  {k?.name ?? r.kind}
                </span>
                <span
                  onClick={() => selectCard(r.to)}
                  style={{
                    color: "var(--accent-gold)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {cardName(r.to)}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleDelete(r)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    padding: "1px 6px",
                    color: "var(--danger)",
                  }}
                  title="删除关系"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          入边（{incoming.length}）
        </div>
        {incoming.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {incoming.map((r) => {
            const k = kindOf(r.kind);
            const label = k?.inverse_name || k?.name || r.kind;
            return (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  fontSize: 12,
                }}
              >
                <span
                  onClick={() => selectCard(r.from)}
                  style={{
                    color: "var(--accent-gold)",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {cardName(r.from)}
                </span>
                <span style={{ color: k?.color ?? "var(--fg-secondary)" }}>
                  {label}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => handleDelete(r)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    padding: "1px 6px",
                    color: "var(--danger)",
                  }}
                  title="删除关系"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}