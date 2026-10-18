import { useMemo } from "react";
import { ipc, type Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { useDraft } from "../../../../hooks/useDraft";
import { nowMs } from "../../../../lib/time";
import { ScenarioGlobalSettings } from "./ScenarioGlobalSettings";

export function ScenarioInspector() {
  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const currentScenarioId = useProjectStore((s) => s.currentScenarioId);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  const scenario = currentScenarioId
    ? (scenarios.find((s) => s.id === currentScenarioId) ?? null)
    : null;

  const emptyScenario: Scenario = useMemo(
    () => ({
      id: "",
      name: "",
      description: null,
      entry_knot: null,
      created_at: 0,
      updated_at: 0,
    }),
    [],
  );

  const { draft, update } = useDraft(
    scenario ?? emptyScenario,
    async (d): Promise<void | boolean> => {
      if (!d.id || !d.name.trim()) return false;
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
