import { useState } from "react";
import { ipc, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { CardTypeEditor } from "./CardTypeEditor";
import { RelationKindList } from "./RelationKindList";

export function CardTypeList() {
  const [subTab, setSubTab] = useState<"card" | "relation">("card");

  return (
    <div>
      <div style={{ marginBottom: 12, borderBottom: "1px solid #eee" }}>
        <button
          onClick={() => setSubTab("card")}
          disabled={subTab === "card"}
          style={{ marginRight: 8 }}
        >
          卡牌类型
        </button>
        <button
          onClick={() => setSubTab("relation")}
          disabled={subTab === "relation"}
        >
          关系类型
        </button>
      </div>
      {subTab === "card" ? <CardTypeSection /> : <RelationKindList />}
    </div>
  );
}

function CardTypeSection() {
  const cardTypes = useProjectStore((s) => s.cardTypes);
  const upsertCardType = useProjectStore((s) => s.upsertCardType);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addType() {
    const now = Date.now();
    const newType: CardType = {
      id: crypto.randomUUID(),
      name: "新类型",
      fields: [],
      allowed_relation_kinds: [],
      views: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertCardType(newType);
    upsertCardType(newType);
    setSelectedId(newType.id);
  }

  const selected = cardTypes.find((t) => t.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ minWidth: 180 }}>
        <button onClick={addType}>新建类型</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {cardTypes.map((t) => (
            <li
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              style={{
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: t.id === selectedId ? "bold" : "normal",
              }}
            >
              {t.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1 }}>
        {selected ? (
          <CardTypeEditor key={selected.id} cardType={selected} />
        ) : (
          <p style={{ color: "#888" }}>选择或新建一个卡牌类型</p>
        )}
      </div>
    </div>
  );
}