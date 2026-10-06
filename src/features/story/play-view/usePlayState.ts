import { useEffect, useMemo, useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type Scenario,
} from "../../../core/ipc";
import { applyEffects, parseEffects } from "../effects";

export interface LastRoll {
  key: string;
  raw: string;
  resolved: number | boolean | string;
  detail: number[];
}

export function usePlayState(
  scenario: Scenario,
  cards: Card[],
  relations: Relation[],
  currentSessionId: string | null
) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    return init;
  });

  const [currentId, setCurrentId] = useState<string | null>(
    scenario.entry_node ?? scenario.node_ids[0] ?? null
  );
  const [history, setHistory] = useState<string[]>([]);
  const [edgeStates, setEdgeStates] = useState<
    Record<string, { ok: boolean; error?: string }>
  >({});
  const [lastRolls, setLastRolls] = useState<LastRoll[]>([]);

  const nodeIds = useMemo(
    () => new Set(scenario.node_ids),
    [scenario.node_ids]
  );

  const outgoing = useMemo(
    () =>
      relations.filter(
        (r) =>
          r.from === currentId &&
          nodeIds.has(r.to) &&
          r.meta?.scenario_id === scenario.id
      ),
    [relations, currentId, nodeIds, scenario.id]
  );

  // 每次变量或关系变化，重新评估所有边的条件
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const states: Record<string, { ok: boolean; error?: string }> = {};
      const allEdges = relations.filter(
        (r) =>
          nodeIds.has(r.from) &&
          nodeIds.has(r.to) &&
          r.meta?.scenario_id === scenario.id
      );
      for (const r of allEdges) {
        const expr =
          typeof r.meta?.condition === "string" ? r.meta.condition : "";
        if (!expr.trim()) {
          states[r.id] = { ok: true };
          continue;
        }
        try {
          const ok = await ipc.evalCondition(scenario, expr, values);
          states[r.id] = { ok };
        } catch (e) {
          states[r.id] = { ok: false, error: String(e) };
        }
      }
      if (!cancelled) setEdgeStates(states);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [relations, nodeIds, values, scenario]);

  function setValue(key: string, val: unknown) {
    setValues((s) => ({ ...s, [key]: val }));
  }

  function resetVars() {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  function advance(relationId: string, toId: string) {
    if (!currentId) return;

    const relation = relations.find((r) => r.id === relationId);
    if (relation) {
      const effects = parseEffects(relation.meta?.effects);
      if (effects.length > 0) {
        const result = applyEffects(values, effects, scenario.variables);
        setValues(result.values);
        if (result.errors.length > 0) {
          console.warn("效果执行警告:", result.errors);
        }

        const rolls = result.applied.filter((a) => a.isRoll);
        if (rolls.length > 0) {
          setLastRolls(
            rolls.map((a) => ({
              key: a.key,
              raw: a.raw,
              resolved: a.resolved,
              detail: a.rollDetail ?? [],
            }))
          );
        } else {
          setLastRolls([]);
        }

        // 如果当前有会话打开，把效果写进事件日志
        if (currentSessionId) {
          void ipc
            .appendEvent(currentSessionId, "effect.apply", {
              scenario_id: scenario.id,
              scenario_name: scenario.name,
              from_card_id: currentId,
              to_card_id: toId,
              relation_label: relation.label,
              applied: result.applied.map((a) => ({
                key: a.key,
                op: a.op,
                raw: a.raw,
                resolved: a.resolved,
                is_roll: a.isRoll,
                roll_detail: a.rollDetail,
              })),
              values_after: result.values,
            })
            .catch((e) => console.warn("写事件日志失败:", e));
        }
      } else {
        setLastRolls([]);
      }
    }

    setHistory((h) => [...h, currentId]);
    setCurrentId(toId);
  }

  function back() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrentId(prev);
      return h.slice(0, -1);
    });
  }

  function reset() {
    setHistory([]);
    setCurrentId(scenario.entry_node ?? scenario.node_ids[0] ?? null);
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  return {
    values,
    setValue,
    currentId,
    history,
    edgeStates,
    lastRolls,
    outgoing,
    advance,
    back,
    reset,
    resetVars,
  };
}