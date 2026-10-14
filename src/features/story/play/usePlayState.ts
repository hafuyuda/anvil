import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../../../stores/projectStore";
import { ipc, type Scenario, type VariableDef } from "../../../core/ipc";
import { toast } from "../../../lib/toast";
import { applyEffects, type AppliedEffect, type ParsedEffect } from "../effects";
import { evalCondition } from "../script/eval";
import { parseScript } from "../script/parser";
import type {
  ParsedScript,
  ScriptFrontmatter,
  ScriptLine,
} from "../script/types";

export interface LastRoll {
  key: string;
  raw: string;
  resolved: number | boolean | string;
  detail: number[];
}

/** 运行时状态（§4.1）。glue 是内部粘合标记：下一文本行与前一行拼接。 */
export interface RuntimeState {
  sceneId: string | null;
  pc: number;
  values: Record<string, unknown>;
  displayLine: ScriptLine | null;
  jumps: { target: string }[];
  bg: string | null;
  bgm: string | null;
  glue: boolean;
}

/** back() 用的快照：状态 + 当前显示（bg / bgm / sfx 不回放，不入快照）。 */
interface HistoryEntry {
  sceneId: string;
  pc: number;
  values: Record<string, unknown>;
  displayLine: ScriptLine | null;
  jumps: { target: string }[];
  glue: boolean;
}

/** 循环保护：单次推进最多扫描的步数。 */
const MAX_STEPS = 1000;

interface StepResult {
  state: RuntimeState;
  sfx: string[];
  rolls: AppliedEffect[];
  error: string | null;
}

export function usePlayState(scenario: Scenario) {
  const cards = useProjectStore((s) => s.cards) ?? [];

  const [rt, setRt] = useState<RuntimeState>(() => initialRt(scenario));
  const rtRef = useRef(rt);
  function updateRt(next: RuntimeState) {
    rtRef.current = next;
    setRt(next);
  }

  const [script, setScript] = useState<ParsedScript | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastRolls, setLastRolls] = useState<LastRoll[]>([]);
  const [sfx, setSfx] = useState<string[]>([]);

  // 场景切换后待执行的入场动作：fresh = 从头进入；restore = 回退恢复快照
  const entryRef = useRef<"fresh" | "restore" | null>("fresh");
  const restoreRef = useRef<HistoryEntry | null>(null);

  // 加载当前场景的剧本，加载完成后执行入场动作
  useEffect(() => {
    const sceneId = rt.sceneId;
    if (!sceneId) {
      setScript(null);
      return;
    }
    let cancelled = false;
    setScriptLoading(true);
    ipc
      .loadScript(sceneId)
      .then((content) => {
        if (cancelled) return;
        const parsed =
          content && content.trim() !== "" ? parseScript(content) : null;
        setScript(parsed);
        enterScene(sceneId, parsed);
      })
      .catch(() => {
        if (!cancelled) {
          setScript(null);
          enterScene(sceneId, null);
        }
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.sceneId]);

  function enterScene(sceneId: string, parsed: ParsedScript | null) {
    const mode = entryRef.current ?? "fresh";
    entryRef.current = null;

    if (mode === "restore") {
      const snap = restoreRef.current;
      restoreRef.current = null;
      if (snap) {
        // 回退：恢复快照，不重放副作用（bg / bgm 保持当前值）
        updateRt({ ...snap, bg: rtRef.current.bg, bgm: rtRef.current.bgm });
        return;
      }
    }

    // 全新进入：frontmatter 决定初始 bg / bgm，pc 归零，立即推进一次
    runStep(freshEntry(sceneId, parsed, rtRef.current.values), parsed);
  }

  function runStep(state: RuntimeState, parsed: ParsedScript | null) {
    if (!parsed) {
      updateRt(state);
      setSfx([]);
      return;
    }
    const result = step(state, parsed, scenario.variables);
    updateRt(result.state);
    setSfx(result.sfx);
    setLastRolls(
      result.rolls.map((a) => ({
        key: a.key,
        raw: a.raw,
        resolved: a.resolved,
        detail: a.rollDetail ?? [],
      })),
    );
    if (result.error) toast.error(result.error);
  }

  // ── 推进 ──
  function advanceLine() {
    const cur = rtRef.current;
    if (!script || script.lines.length === 0) return;
    if (cur.jumps.length > 0) return; // 等待选择
    if (cur.pc >= script.lines.length) return; // atEnd
    runStep({ ...cur, pc: cur.pc + 1 }, script);
  }

  // ── 选择跳转：场景名 → card.id ──
  function chooseJump(target: string) {
    const cur = rtRef.current;
    const card = cards.find((c) => c.name === target);
    if (!card || !scenario.node_ids.includes(card.id)) {
      toast.error(`找不到场景：${target}`);
      return; // 停在当前场景
    }
    pushHistory(cur);

    if (card.id === cur.sceneId && script) {
      // 同场景跳转：重新入场
      runStep(
        freshEntry(card.id, script, cur.values),
        script,
      );
      return;
    }
    entryRef.current = "fresh";
    updateRt({
      ...cur,
      sceneId: card.id,
      pc: 0,
      displayLine: null,
      jumps: [],
      glue: false,
    });
  }

  // ── 回退 ──
  function back() {
    if (history.length === 0) return;
    const cur = rtRef.current;
    const snap = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));

    if (snap.sceneId === cur.sceneId) {
      // 同场景：直接恢复快照
      updateRt({ ...snap, bg: cur.bg, bgm: cur.bgm });
      return;
    }
    restoreRef.current = snap;
    entryRef.current = "restore";
    updateRt({ ...cur, sceneId: snap.sceneId, jumps: [] });
  }

  function reset() {
    setHistory([]);
    setLastRolls([]);
    const sceneId = scenario.entry_node ?? scenario.node_ids[0] ?? null;
    if (!sceneId) {
      updateRt(initialRt(scenario));
      setSfx([]);
      return;
    }
    if (sceneId === rtRef.current.sceneId && script) {
      runStep(freshEntry(sceneId, script, initValues(scenario)), script);
      return;
    }
    entryRef.current = "fresh";
    updateRt({
      ...rtRef.current,
      sceneId,
      pc: 0,
      values: initValues(scenario),
      displayLine: null,
      jumps: [],
      glue: false,
    });
  }

  function setValue(key: string, val: unknown) {
    updateRt({
      ...rtRef.current,
      values: { ...rtRef.current.values, [key]: val },
    });
  }

  function resetVars() {
    updateRt({ ...rtRef.current, values: initValues(scenario) });
  }

  function pushHistory(state: RuntimeState) {
    if (!state.sceneId) return;
    const snap: HistoryEntry = {
      sceneId: state.sceneId,
      pc: state.pc,
      values: state.values,
      displayLine: state.displayLine,
      jumps: state.jumps,
      glue: state.glue,
    };
    setHistory((h) => [...h, snap]);
  }

  const lines = script?.lines ?? [];
  const atEnd = rt.sceneId !== null && lines.length > 0 && rt.pc >= lines.length;
  const hasScript = lines.length > 0;

  return {
    values: rt.values,
    setValue,
    currentId: rt.sceneId,
    history,
    lastRolls,
    jumps: rt.jumps,
    chooseJump,
    back,
    reset,
    resetVars,
    // 剧本
    script,
    scriptLoading,
    advanceLine,
    atEnd,
    hasScript,
    currentLine: rt.displayLine,
    currentBg: rt.bg,
    currentBgm: rt.bgm,
    currentSfx: sfx,
    isEnding: Boolean(script?.frontmatter.is_ending),
    endingName: script?.frontmatter.ending_name ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// 纯函数部分
// ─────────────────────────────────────────────────────────────

function initValues(scenario: Scenario): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  for (const v of scenario.variables) {
    init[v.key] = v.default ?? null;
  }
  return init;
}

function initialRt(scenario: Scenario): RuntimeState {
  return {
    sceneId: scenario.entry_node ?? scenario.node_ids[0] ?? null,
    pc: 0,
    values: initValues(scenario),
    displayLine: null,
    jumps: [],
    bg: null,
    bgm: null,
    glue: false,
  };
}

function freshEntry(
  sceneId: string,
  parsed: ParsedScript | null,
  values: Record<string, unknown>,
): RuntimeState {
  const fm: ScriptFrontmatter = parsed?.frontmatter ?? {};
  return {
    sceneId,
    pc: 0,
    values,
    displayLine: null,
    jumps: [],
    bg: fm.bg ?? null,
    bgm: fm.bgm ?? null,
    glue: false,
  };
}

/** 从 pc 起扫描剧本：执行指令行，停在可显示行或 jump 列表。 */
function step(
  state: RuntimeState,
  script: ParsedScript,
  variables: VariableDef[],
): StepResult {
  let { pc, values, displayLine, glue } = state;
  let bg = state.bg;
  let bgm = state.bgm;
  const sfx: string[] = [];
  const rolls: AppliedEffect[] = [];
  const jumps: { target: string }[] = [];
  const lines = script.lines;

  let stopped = false;

  for (let i = 0; i < MAX_STEPS && !stopped; i++) {
    const line: ScriptLine | undefined = lines[pc];
    if (!line) break; // 越界 → atEnd

    switch (line.type) {
      case "assign": {
        const result = applyEffects(values, [toEffect(line)], variables);
        values = result.values;
        if (result.errors.length > 0) {
          console.warn("赋值执行警告:", result.errors);
        }
        rolls.push(...result.applied.filter((a) => a.isRoll));
        pc++;
        break;
      }
      case "condition": {
        if (evalCondition(line.expr, values)) {
          displayLine = mergeGlue(glue, displayLine, line);
          glue = false;
          stopped = true;
        } else {
          pc++;
        }
        break;
      }
      case "glue":
        glue = true;
        pc++;
        break;
      case "bg":
        bg = line.image;
        pc++;
        break;
      case "bgm":
        bgm = line.file;
        pc++;
        break;
      case "sfx":
        sfx.push(line.file);
        pc++;
        break;
      case "jump": {
        // 收集连续的 jump 行为选项
        while (lines[pc]?.type === "jump") {
          jumps.push({ target: (lines[pc] as Extract<ScriptLine, { type: "jump" }>).target });
          pc++;
        }
        stopped = true;
        break;
      }
      default:
        // narration / say / action：停止，显示
        displayLine = mergeGlue(glue, displayLine, line);
        glue = false;
        stopped = true;
        break;
    }
  }

  // 扫描步数用尽仍未停止 → 循环保护触发
  const error =
    !stopped && lines[pc] ? `剧本推进超过 ${MAX_STEPS} 步，已停止` : null;

  return {
    state: { ...state, pc, values, displayLine, jumps, bg, bgm, glue },
    sfx,
    rolls,
    error,
  };
}

/** 粘合：新文本行拼接到前一行显示。 */
function mergeGlue(
  glue: boolean,
  prev: ScriptLine | null,
  line: ScriptLine,
): ScriptLine {
  if (glue && prev && "text" in prev && "text" in line) {
    return { ...prev, text: `${prev.text}\n${line.text}` };
  }
  return line;
}

/** 赋值行复用 effects 管道执行（骰子 / 类型转换语义一致）。 */
function toEffect(line: Extract<ScriptLine, { type: "assign" }>): ParsedEffect {
  return {
    key: line.key,
    op: line.op,
    rawValue: line.value,
    raw: `${line.key} ${line.op} ${line.value}`,
  };
}
