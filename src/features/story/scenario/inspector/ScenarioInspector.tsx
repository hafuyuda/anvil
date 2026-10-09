import { useMemo, useState } from "react";
import { ipc, type Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { useDraft } from "../../../../hooks/useDraft";
import { nowMs } from "../../../../lib/time";
import { EdgeEditorPanel } from "../EdgeEditorPanel";
import { SceneBranchesPanel } from "./SceneBranchesPanel";
import { ScenarioGlobalSettings } from "./ScenarioGlobalSettings";

type Mode = "scene" | "global";

export function ScenarioInspector() {
  const scenarios = useProjectStore((s) => s.scenarios) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const currentScenarioId = useProjectStore((s) => s.currentScenarioId);
  const currentSceneId = useProjectStore((s) => s.currentSceneId);
  const selectedEdgeId = useProjectStore((s) => s.selectedEdgeId);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);

  const [mode, setMode] = useState<Mode>("scene");

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

  // 边编辑优先
  const edge = selectedEdgeId
    ? (relations.find((r) => r.id === selectedEdgeId) ?? null)
    : null;
  if (edge && edge.meta?.scenario_id === scenario.id) {
    return (
      <EdgeEditorPanel key={edge.id} relation={edge} scenario={scenario} />
    );
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
      {/* 模式切换 */}
      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: 4,
        }}
      >
        <ModeButton active={mode === "scene"} onClick={() => setMode("scene")}>
          场景
        </ModeButton>
        <ModeButton
          active={mode === "global"}
          onClick={() => setMode("global")}
        >
          剧情
        </ModeButton>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {mode === "scene" && currentSceneId && (
          <SceneBranchesPanel scenario={scenario} sceneId={currentSceneId} />
        )}
        {mode === "scene" && !currentSceneId && (
          <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>
            在剧本页选择一个场景
          </p>
        )}
        {mode === "global" && (
          <ScenarioGlobalSettings draft={draft} update={update} />
        )}
      </div>
    </div>
  );
}

function ModeButton({
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
        padding: "4px 12px",
        fontSize: 12,
      }}
    >
      {children}
    </button>
  );
}
