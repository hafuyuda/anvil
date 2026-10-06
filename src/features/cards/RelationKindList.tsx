import { useState } from "react";
import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { RelationKindEditor } from "./RelationKindEditor";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";

export function RelationKindList() {
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const upsertRelationKind = useProjectStore((s) => s.upsertRelationKind);
  const removeRelationKind = useProjectStore((s) => s.removeRelationKind);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addKind() {
    const now = nowMs();
    const newKind: RelationKind = {
      id: newId(),
      name: "新关系",
      inverse_name: null,
      directed: true,
      color: null,
      from_types: [],
      to_types: [],
      fields: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertRelationKind(newKind);
    upsertRelationKind(newKind);
    setSelectedId(newKind.id);
  }

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete(s: RelationKind) {
    if (!confirm(`删除「${s.name}」？可用 Ctrl+Z 撤销。`)) return;
    try {
      await deleteWithUndo({
        label: "删除关系",
        do: async () => {
          await ipc.deleteRelationKind(s.id);
          removeRelationKind(s.id);
          if (selectedId === s.id) setSelectedId(null);
        },
        restore: async () => {
          await ipc.upsertRelationKind(s);
          upsertRelationKind(s);
        },
      });
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="关系类型"
      items={relationKinds}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addKind}
      onDelete={handleDelete}
      createLabel="+ 新建关系类型"
      renderItem={(k) => (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: k.color ?? "var(--fg-muted)",
              display: "inline-block",
            }}
          />
          {k.name}
        </span>
      )}
      renderEditor={(k) => <RelationKindEditor key={k.id} relationKind={k} />}
      emptyHint="选择或新建一个关系类型"
    />
  );
}
