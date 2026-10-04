import { useState } from "react";
import { ipc, type Scenario } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { ScenarioEditor } from "./ScenarioEditor";

export function ScenarioList() {
  const scenarios = useProjectStore((s) => s.scenarios);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addScenario() {
    const now = Date.now();
    const s: Scenario = {
      id: crypto.randomUUID(),
      name: "新剧情",
      description: null,
      entry_node: null,
      node_ids: [],
      edge_kinds: [],
      node_positions: {},
      variables: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertScenario(s);
    upsertScenario(s);
    setSelectedId(s.id);
  }

  const selected = scenarios.find((s) => s.id === selectedId) ?? null;

  return (
    <div style={{ display: "flex", gap: 16, height: "100%" }}>
      <div style={{ minWidth: 180 }}>
        <button onClick={addScenario}>新建剧情</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {scenarios.map((s) => (
            <li
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              style={{
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: s.id === selectedId ? "bold" : "normal",
              }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ flex: 1, minWidth: 0, minHeight: 500 }}>
        {selected ? (
          <ScenarioEditor key={selected.id} scenario={selected} />
        ) : (
          <p style={{ color: "#888" }}>选择或新建一个剧情</p>
        )}
      </div>
    </div>
  );
}