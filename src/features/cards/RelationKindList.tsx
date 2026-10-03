import { useState } from "react";
import { ipc, type RelationKind } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { RelationKindEditor } from "./RelationKindEditor";

export function RelationKindList() {
  const relationKinds = useProjectStore((s) => s.relationKinds);
  const upsertRelationKind = useProjectStore((s) => s.upsertRelationKind);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addKind() {
    const now = Date.now();
    const newKind: RelationKind = {
      id: crypto.randomUUID(),
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

  const selected = relationKinds.find((k) => k.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ minWidth: 180 }}>
        <button onClick={addKind}>新建关系类型</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {relationKinds.map((k) => (
            <li
              key={k.id}
              onClick={() => setSelectedId(k.id)}
              style={{
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: k.id === selectedId ? "bold" : "normal",
              }}
            >
              {k.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1 }}>
        {selected ? (
          <RelationKindEditor key={selected.id} relationKind={selected} />
        ) : (
          <p style={{ color: "#888" }}>选择或新建一个关系类型</p>
        )}
      </div>
    </div>
  );
}
