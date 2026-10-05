import { useState } from "react";
import { ipc, type Scenario } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { ScenarioEditor } from "./ScenarioEditor";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

export function ScenarioList() {
  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addScenario() {
    const now = nowMs();
    const s: Scenario = {
      id: newId(),
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

  return (
    <EntityListLayout
      listLabel="剧情"
      items={scenarios}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addScenario}
      createLabel="+ 新建剧情"
      renderItem={(s) => s.name}
      renderEditor={(s) => <ScenarioEditor key={s.id} scenario={s} />}
      emptyHint="选择或新建一个剧情"
    />
  );
}