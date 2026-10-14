import { useMemo } from "react";
import { ipc, type Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { useDraft } from "../../../../hooks/useDraft";
import { nowMs } from "../../../../lib/time";
import { EdgeEditorPanel } from "../EdgeEditorPanel";
import { ScenarioGlobalSettings } from "./ScenarioGlobalSettings";

export function ScenarioInspector() {
  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const currentScenarioId = useProjectStore((s) => s.currentScenarioId);
  const selectedEdgeId = useProjectStore((s) => s.selectedEdgeId);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  const scenario = currentScenarioId
    ? (scenarios.find((s) => s.id === currentScenarioId) ?? null)
    : null;

  const emptyScenario: Scenario = useMemo(
    () => ({
      id: "",
      name: "",
      description: null,
      entry_node: null,
      node_ids: [],
      edge_kinds: [],
      node_positions: {},
      variables: [],
      created_at: 0,
      updated_at: 0,
    }),
    [],
  );

  const { draft, update } = useDraft(
    scenario ?? emptyScenario,
    async (d): Promise<void | boolean> => {
      if (!d.id || !d.name.trim()) return false;
      const keys = d.variables.map((v) => v.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) return false;
      const next: Scenario = { ...d, updated_at: nowMs() };
      await ipc.upsertScenario(next);
      upsertScenario(next);
    },
    {
      undoLabel: "编辑剧情",
      onDraftChange: (d) => {
        if (!d.id) return;
        upsertScenario({ ...d, updated_at: nowMs() });
      },
    },
  );

  if (!scenario) {
    return <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>未选中剧情</p>;
  }

  // 边编辑优先（旧剧情边的遗留数据，只能改 label / kind）
  const edge = selectedEdgeId
    ? (relations.find((r) => r.id === selectedEdgeId) ?? null)
    : null;
  if (edge && edge.meta?.scenario_id === scenario.id) {
    return <EdgeEditorPanel key={edge.id} relation={edge} scenario={scenario} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
        minHeight: 0,
      }}
    >
      <ScenarioGlobalSettings draft={draft} update={update} />
    </div>
  );
}
