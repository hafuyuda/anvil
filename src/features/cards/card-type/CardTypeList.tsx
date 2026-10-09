import { useState } from "react";
import { ipc, type CardType } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { EntityListLayout } from "../../../components/EntityListLayout";
import { CardTypeEditor } from "./CardTypeEditor";
import { RelationKindList } from "../relation/RelationKindList";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { newId } from "../../../lib/id";
import { nowMs } from "../../../lib/time";
import { toast } from "../../../lib/toast";
import { confirmDialog } from "../../../lib/confirm";
export function CardTypeList() {
  const [subTab, setSubTab] = useState<"card" | "relation">("card");
  const selectCardType = useProjectStore((s) => s.selectCardType);

  function switchTab(t: "card" | "relation") {
    setSubTab(t);
    if (t !== "card") selectCardType(null);
  }

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
        <TabButton active={subTab === "card"} onClick={() => switchTab("card")}>
          卡牌类型
        </TabButton>
        <TabButton
          active={subTab === "relation"}
          onClick={() => switchTab("relation")}
        >
          关系类型
        </TabButton>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {subTab === "card" ? <CardTypeSection /> : <RelationKindList />}
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
  const selectedId = useProjectStore((s) => s.selectedCardTypeId);
  const selectCardType = useProjectStore((s) => s.selectCardType);

  const deleteWithUndo = useDeleteUndo();

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
    selectCardType(newType.id);
  }

  async function duplicateType(t: CardType) {
    const now = nowMs();
    // 深拷贝 fields / card_frame，只换 id 和 name
    const clonedFields = t.fields.map((f) => ({
      ...f,
      ty: { ...f.ty } as typeof f.ty,
      default: f.default,
    }));
    const clonedFrame = t.card_frame
      ? {
          ...t.card_frame,
          body: [...t.card_frame.body],
          foil_values: [...(t.card_frame.foil_values ?? [])],
        }
      : null;

    const copy: CardType = {
      id: newId(),
      name: `${t.name}（副本）`,
      icon: t.icon,
      color: t.color,
      description: t.description,
      fields: clonedFields,
      allowed_relation_kinds: [...t.allowed_relation_kinds],
      views: [...t.views],
      card_frame: clonedFrame,
      created_at: now,
      updated_at: now,
    };
    try {
      await ipc.upsertCardType(copy);
      upsertCardType(copy);
      selectCardType(copy.id);
    } catch (e) {
      toast.error("复制失败: " + e);
    }
  }

  async function handleDelete(t: CardType) {
    const inUse = cards.filter((c) => c.type_id === t.id).length;
    if (inUse > 0) {
      toast.info(`还有 ${inUse} 张卡在使用这个类型，先删除或改类型。`);
      return;
    }
    if (
      !(await confirmDialog({
        message: `删除类型「${t.name}」？可用 Ctrl+Z 撤销。`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    try {
      await deleteWithUndo({
        label: "删除卡牌类型",
        do: async () => {
          await ipc.deleteCardType(t.id);
          removeCardType(t.id);
          if (selectedId === t.id) selectCardType(null);
        },
        restore: async () => {
          await ipc.upsertCardType(t);
          upsertCardType(t);
        },
      });
    } catch (e) {
      toast.error("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="卡牌类型"
      items={cardTypes}
      selectedId={selectedId}
      onSelect={(id) => selectCardType(id)}
      onCreate={addType}
      onDelete={handleDelete}
      createLabel="+ 新建卡牌类型"
      renderItem={(t) => t.name}
      renderEditor={(t) => <CardTypeEditor key={t.id} cardType={t} />}
      emptyHint="选择或新建一个卡牌类型"
      itemActions={(t) => (
        <button
          className="btn btn-ghost"
          onClick={() => void duplicateType(t)}
          title="复制此类型"
          style={{
            padding: "1px 6px",
            fontSize: 12,
            color: "var(--fg-muted)",
          }}
        >
          ⧉
        </button>
      )}
    />
  );
}
