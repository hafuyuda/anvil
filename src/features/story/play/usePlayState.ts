import { useEffect, useMemo, useState } from "react";
import {
  ipc,
  type Card,
  type Relation,
  type Scenario,
} from "../../../core/ipc";
import { applyEffects, parseEffects } from "../effects";
import { parseScript } from "../script/parser";
import type { ParsedScript, ScriptLine } from "../script/types";

export interface LastRoll {
  key: string;
  raw: string;
  resolved: number | boolean | string;
  detail: number[];
}

export function usePlayState(
  scenario: Scenario,
  _cards: Card[],
  relations: Relation[],
) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    return init;
  });

  const [currentId, setCurrentId] = useState<string | null>(
    scenario.entry_node ?? scenario.node_ids[0] ?? null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [edgeStates, setEdgeStates] = useState<
    Record<string, { ok: boolean; error?: string }>
  >({});
  const [lastRolls, setLastRolls] = useState<LastRoll[]>([]);

  // ── 剧本状态 ──
  const [script, setScript] = useState<ParsedScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [effectiveLines, setEffectiveLines] = useState<ScriptLine[]>([]);
  const [bgAt, setBgAt] = useState<(string | null)[]>([]);

  const nodeIds = useMemo(
    () => new Set(scenario.node_ids),
    [scenario.node_ids],
  );

  const outgoing = useMemo(
    () =>
      relations.filter(
        (r) =>
          r.from === currentId &&
          nodeIds.has(r.to) &&
          r.meta?.scenario_id === scenario.id,
      ),
    [relations, currentId, nodeIds, scenario.id],
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
          r.meta?.scenario_id === scenario.id,
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

  // 加载当前场景的剧本
  useEffect(() => {
    if (!currentId) {
      setScript(null);
      setEffectiveLines([]);
      setBgAt([]);
      setLineIndex(0);
      return;
    }
    let cancelled = false;
    setScriptLoading(true);
    ipc
      .loadScript(currentId)
      .then((content) => {
        if (cancelled) return;
        if (!content || content.trim() === "") {
          setScript(null);
          setEffectiveLines([]);
          setBgAt([]);
        } else {
          const parsed = parseScript(content);
          setScript(parsed);

          // 预处理：抽离指令行（bg / bgm / sfx），计算每一行的背景
          const eff: ScriptLine[] = [];
          const bgs: (string | null)[] = [];
          let currentBg: string | null = parsed.frontmatter.bg ?? null;

          for (const line of parsed.lines) {
            if (line.type === "bg") {
              currentBg = line.image;
            } else if (line.type === "bgm" || line.type === "sfx") {
              // 暂不处理
            } else {
              eff.push(line);
              bgs.push(currentBg);
            }
          }

          setEffectiveLines(eff);
          setBgAt(bgs);
        }
        setLineIndex(0);
      })
      .catch(() => {
        if (!cancelled) {
          setScript(null);
          setEffectiveLines([]);
          setBgAt([]);
          setLineIndex(0);
        }
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

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
            })),
          );
        } else {
          setLastRolls([]);
        }
      } else {
        setLastRolls([]);
      }
    }

    setHistory((h) => [...h, currentId]);
    setCurrentId(toId);
    setLineIndex(0);
  }

  function back() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrentId(prev);
      setLineIndex(0);
      return h.slice(0, -1);
    });
  }

  function reset() {
    setHistory([]);
    setCurrentId(scenario.entry_node ?? scenario.node_ids[0] ?? null);
    setLineIndex(0);
    const init: Record<string, unknown> = {};
    for (const v of scenario.variables) {
      init[v.key] = v.default ?? null;
    }
    setValues(init);
  }

  function advanceLine() {
    if (effectiveLines.length === 0) return;
    if (lineIndex < effectiveLines.length - 1) {
      setLineIndex((i) => i + 1);
    }
  }

  function jumpToEnd() {
    if (effectiveLines.length === 0) return;
    setLineIndex(effectiveLines.length - 1);
  }

  const atEnd =
    effectiveLines.length === 0 || lineIndex >= effectiveLines.length - 1;
  const hasScript = effectiveLines.length > 0;

  const currentLine: ScriptLine | null =
    effectiveLines.length > 0
      ? effectiveLines[Math.min(lineIndex, effectiveLines.length - 1)]
      : null;

  const currentBg: string | null =
    bgAt.length > 0 ? bgAt[Math.min(lineIndex, bgAt.length - 1)] : null;

  const isEnding = Boolean(script?.frontmatter.is_ending);
  const endingName = script?.frontmatter.ending_name ?? null;

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
    // 剧本
    script,
    scriptLoading,
    lineIndex,
    advanceLine,
    jumpToEnd,
    atEnd,
    hasScript,
    currentLine,
    currentBg,
    effectiveLineCount: effectiveLines.length,
    isEnding,
    endingName,
  };
}
