import { useState } from "react";
import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { RelationKindEditor } from "./RelationKindEditor";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

export function RelationKindList() {
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertRelationKind = useProjectStore((s) => s.upsertRelationKind);
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

  return (
    <EntityListLayout
      listLabel="关系类型"
      items={relationKinds}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addKind}
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