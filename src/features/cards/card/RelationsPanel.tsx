import { useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type RelationKind,
} from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { RelationForm } from "../relation/RelationForm";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";


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

  const cardName = (id: string) =>
    cards.find((c) => c.id === id)?.name ?? id.slice(0, 8);

  const kindOf = (id: string): RelationKind | undefined =>
    relationKinds.find((k) => k.id === id);

  const isUndirected = (kindId: string) => {
    const k = kindOf(kindId);
    return k ? !k.directed : false;
  };

  // 只处理世界观边
  const worldRelations = relations.filter((r) => !r.meta?.scenario_id);

  // 从本卡出发：
  // - 有向边：r.from === card.id
  // - 无向边：r.from 或 r.to 任一侧是 card.id 都算
  const outgoing = worldRelations.filter((r) => {
    if (r.from === card.id) return true;
    if (r.to === card.id && isUndirected(r.kind)) return true;
    return false;
  });

  // 指向本卡：
  // - 有向边：r.to === card.id
  // - 无向边不算（已归到 outgoing）
  const incoming = worldRelations.filter((r) => {
    if (r.to === card.id && !isUndirected(r.kind)) return true;
    return false;
  });

  const deleteWithUndo = useDeleteUndo();
  const upsertRelation = useProjectStore((s) => s.upsertRelation);

  async function handleDelete(r: Relation) {
    if (!confirm("确认删除这条关系？可用 Ctrl+Z 撤销。")) return;
    try {
      await deleteWithUndo({
        label: "删除关系",
        do: async () => {
          await ipc.deleteRelation(r.from, r.id);
          removeRelation(r.id);
        },
        restore: async () => {
          await ipc.upsertRelation(r);
          upsertRelation(r);
        },
      });
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  function renderRow(r: Relation, mode: "out" | "in") {
    const k = kindOf(r.kind);
    const undirected = k ? !k.directed : false;

    // 显示对方卡
    let otherId: string;
    let arrow: string;

    if (mode === "out") {
      if (r.from === card.id) {
        otherId = r.to;
        arrow = undirected ? "⇄" : "→";
      } else {
        // 无向关系的反向（当前卡是 to）
        otherId = r.from;
        arrow = "⇄";
      }
    } else {
      // in：有向入边
      otherId = r.from;
      arrow = "→";
    }

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
        <span style={{ color: "var(--fg-muted)" }}>{arrow}</span>
        <span
          onClick={() => selectCard(otherId)}
          style={{
            color: "var(--accent-gold)",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {cardName(otherId)}
        </span>
        {r.label && (
          <span
            style={{
              color: "var(--fg-muted)",
              fontStyle: "italic",
              fontSize: 11,
            }}
          >
            （{r.label}）
          </span>
        )}
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
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 从本卡出发 */}
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
            本卡参与（{outgoing.length}）
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
          {outgoing.map((r) => renderRow(r, "out"))}
        </ul>
      </div>

      {/* 指向本卡 */}
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
          指向本卡（{incoming.length}）
        </div>
        {incoming.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>无</div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {incoming.map((r) => renderRow(r, "in"))}
        </ul>
      </div>
    </div>
  );
}
