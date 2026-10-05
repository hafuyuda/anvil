import { useState } from "react";
import { ipc, type CardType } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { CardTypeEditor } from "./CardTypeEditor";
import { RelationKindList } from "./RelationKindList";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

export function CardTypeList() {
  const [subTab, setSubTab] = useState<"card" | "relation">("card");

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
        }}
      >
        <TabButton active={subTab === "card"} onClick={() => setSubTab("card")}>
          卡牌类型
        </TabButton>
        <TabButton
          active={subTab === "relation"}
          onClick={() => setSubTab("relation")}
        >
          关系类型
        </TabButton>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {subTab === "card" ? <CardTypeSection /> : <RelationKindSection />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
      }}
    >
      {children}
    </button>
  );
}

function CardTypeSection() {
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const cards = useProjectStore((s) => s.cards) ?? [];
  const upsertCardType = useProjectStore((s) => s.upsertCardType);
  const removeCardType = useProjectStore((s) => s.removeCardType);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addType() {
    const now = nowMs();
    const newType: CardType = {
      id: newId(),
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

  async function handleDelete(t: CardType) {
    const inUse = cards.filter((c) => c.type_id === t.id).length;
    if (inUse > 0) {
      alert(`还有 ${inUse} 张卡在使用这个类型，先删除或改类型。`);
      return;
    }
    if (!confirm(`删除类型「${t.name}」？`)) return;
    try {
      await ipc.deleteCardType(t.id);
      removeCardType(t.id);
      if (selectedId === t.id) setSelectedId(null);
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="卡牌类型"
      items={cardTypes}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addType}
      onDelete={handleDelete}
      createLabel="+ 新建卡牌类型"
      renderItem={(t) => t.name}
      renderEditor={(t) => <CardTypeEditor key={t.id} cardType={t} />}
      emptyHint="选择或新建一个卡牌类型"
    />
  );
}

function RelationKindSection() {
  return <RelationKindList />;
}
