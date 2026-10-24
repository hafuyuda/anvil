import { useEffect, useMemo, useState } from "react";
import { ipc, type Scenario } from "../../../../core/ipc";
import { useProjectStore } from "../../../../stores/projectStore";
import { useDraft } from "../../../../hooks/useDraft";
import { nowMs } from "../../../../lib/time";
import { parseScript } from "../../script/parser";
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
      resolveCurrent: () =>
        useProjectStore
          .getState()
          .scenarios.find((s) => s.id === (scenario?.id ?? "")) ?? null,
      onDraftChange: (d) => {
        if (!d.id) return;
        upsertScenario({ ...d, updated_at: nowMs() });
      },
    },
  );

  // 剧本解析：全部文件的 knot 名与 VAR 变量（只读展示用）
  const [knotNames, setKnotNames] = useState<string[]>([]);
  const [vars, setVars] = useState<{ key: string; literal: string }[]>([]);

  useEffect(() => {
    const id = scenario?.id;
    if (!id) {
      setKnotNames([]);
      setVars([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const files = await ipc
        .listScenarioScriptFiles(id)
        .catch(() => [] as string[]);
      const contents = await Promise.all(
        files.map(async (f) =>
          ipc.loadScenarioScript(id, f).catch(() => "" as string),
        ),
      );
      if (cancelled) return;
      const knots: string[] = [];
      const vs: { key: string; literal: string }[] = [];
      for (const c of contents) {
        if (!c) continue;
        const p = parseScript(c);
        for (const name of Object.keys(p.knots)) {
          if (!knots.includes(name)) knots.push(name);
        }
        for (const v of p.vars) {
          if (!vs.some((x) => x.key === v.key)) vs.push(v);
        }
      }
      setKnotNames(knots);
      setVars(vs);
    })();
    return () => {
      cancelled = true;
    };
  }, [scenario?.id]);

  if (!scenario) {
    return <p className="muted">未选中剧情</p>;
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
      <ScenarioGlobalSettings
        draft={draft}
        update={update}
        knotNames={knotNames}
        vars={vars}
      />
    </div>
  );
}
