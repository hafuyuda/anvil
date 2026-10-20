import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ipc, type Scenario } from "../../../core/ipc";
import { toast } from "../../../lib/toast";
import type { AppliedEffect } from "../effects";
import { parseScript } from "../script/parser";
import type { ParsedScript, ScriptLine } from "../script/types";
import type { Card, VariableDef } from "../../../core/ipc";
import {
  buildKnotIndex,
  chooseStep,
  continueStep,
  createInitialState,
  varsToVariables,
  type HistoryEntry,
  type KnotIndex,
  type RuntimeState,
} from "./runtime";

export interface LastRoll {
  key: string;
  raw: string;
  resolved: number | boolean | string;
  detail: number[];
}

interface PlayModel {
  files: Map<string, ParsedScript>;
  knots: KnotIndex;
  variables: VariableDef[];
  cards: Card[];
  duplicates: string[];
  entry: { file: string; knot: string; pc: number } | null;
  entryError: string | null;
}

export function usePlayState(scenario: Scenario) {
  const [model, setModel] = useState<PlayModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rt, setRt] = useState<RuntimeState | null>(null);
  const rtRef = useRef<RuntimeState | null>(null);
  function updateRt(next: RuntimeState | null) {
    rtRef.current = next;
    setRt(next);
  }

  /**
   * 说话人名 → 立绘资源路径（按表情）。约定：卡 values 的
   * `portrait_<表情>` 为对应表情 image，无表情时回退 `portrait`。
   * 纯映射，不碰 IO（资源 URL 由 PortraitLayer 异步加载）。
   */
  const portraitLookup = useMemo(() => {
    const byName = new Map<string, Card>();
    for (const c of model?.cards ?? []) byName.set(c.name, c);
    return (speaker: string, emotion?: string | null): string | null => {
      const card = byName.get(speaker);
      if (!card) return null;
      const vals = card.values ?? {};
      const pick = (k: string): string | null => {
        const v = vals[k];
        return typeof v === "string" && v ? v : null;
      };
      if (emotion) {
        const e = pick(`portrait_${emotion}`);
        if (e) return e;
      }
      return pick("portrait");
    };
  }, [model?.cards]);

  /** 当前场景卡（rt.sceneCard 按名解析为 Card），用于场景信息面板。 */
  const currentSceneCard = useMemo(() => {
    const name = rt?.sceneCard;
    if (!name || !model) return null;
    return model.cards.find((c) => c.name === name) ?? null;
  }, [rt?.sceneCard, model]);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastRolls, setLastRolls] = useState<LastRoll[]>([]);
  const [sfx, setSfx] = useState<string[]>([]);

  // 加载所有剧本文件（文件名字典序）
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const filenames = await ipc.listScenarioScriptFiles(scenario.id);
        const files = new Map<string, ParsedScript>();
        for (const filename of filenames) {
          const content = await ipc.loadScenarioScript(scenario.id, filename);
          if (content && content.trim() !== "") {
            files.set(filename, parseScript(content));
          }
        }

        const { knots, duplicates } = buildKnotIndex(files);
        const variables = varsToVariables(
          [...files.values()].flatMap((f) => f.vars),
        );
        const cards = await ipc.listCards();

        // 入口 knot：显式 entry_knot 优先，否则文件名字典序第一个文件的第一个 knot
        let entry: PlayModel["entry"] = null;
        let entryError: string | null = null;
        const explicit = scenario.entry_knot;
        if (explicit) {
          const hit = knots.get(explicit);
          if (hit) {
            entry = { file: hit.file, knot: explicit, pc: hit.pc };
          } else {
            entryError = `找不到入口 knot：${explicit}`;
          }
        } else {
          const firstFile = files.keys().next();
          if (!firstFile.done) {
            const script = files.get(firstFile.value);
            const firstKnot = script
              ? Object.keys(script.knots).sort()[0]
              : undefined;
            if (script && firstKnot) {
              const k = script.knots[firstKnot];
              entry = { file: firstFile.value, knot: firstKnot, pc: k.pc };
            }
          }
          if (!entry) entryError = "剧情没有可进入的 knot";
        }

        if (cancelled) return;
        setModel({ files, knots, variables, cards, duplicates, entry, entryError });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenario.id, scenario.entry_knot]);

  // 模型就绪后初始化运行时
  useEffect(() => {
    if (!model) return;
    setHistory([]);
    setLastRolls([]);
    if (model.entryError || !model.entry) {
      updateRt(null);
      return;
    }
    const fm = model.files.get(model.entry.file)?.frontmatter ?? {};
    const state = createInitialState({
      file: model.entry.file,
      knot: model.entry.knot,
      pc: model.entry.pc,
      variables: model.variables,
      bg: fm.bg ?? null,
      bgm: fm.bgm ?? null,
    });
    updateRt(state);
    pump(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  function pushHistory(state: RuntimeState) {
    setHistory((h) => [
      ...h,
      {
        file: state.file,
        knot: state.knot,
        pc: state.pc,
        values: state.values,
        visited: state.visited,
        currentChoiceGroupStart: state.currentChoiceGroupStart,
        choiceBodyEnd: state.choiceBodyEnd,
        gatherPc: state.gatherPc,
        glue: state.glue,
        displayLine: state.displayLine,
        choices: state.choices,
        portrait: state.portrait,
        sceneCard: state.sceneCard,
      },
    ]);
  }

  function applyResult(
    result: ReturnType<typeof continueStep>,
    prevState: RuntimeState,
  ) {
    setSfx(result.sfx);
    setLastRolls(
      result.rolls.map((a: AppliedEffect) => ({
        key: a.key,
        raw: a.raw,
        resolved: a.resolved,
        detail: a.rollDetail ?? [],
      })),
    );
    if (result.error) {
      toast.error(result.error);
      updateRt({ ...prevState, ended: true });
      return;
    }
    updateRt(result.state);
  }

  /** 推进一步：把当前状态入栈历史，然后 continueStep 扫描到下一个停点。 */
  const advance = useCallback(() => {
    const cur = rtRef.current;
    if (!cur || !model) return;
    pushHistory(cur);
    const result = continueStep(cur, model.files, model.knots, model.variables);
    applyResult(result, cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  /** 从当前状态推进但不入栈（初始进入 / 选择后首步）。 */
  function pump(state: RuntimeState) {
    if (!model) return;
    const result = continueStep(state, model.files, model.knots, model.variables);
    setSfx(result.sfx);
    setLastRolls([]);
    if (result.error) {
      toast.error(result.error);
      updateRt({ ...state, ended: true });
      return;
    }
    updateRt(result.state);
  }

  const choose = useCallback(
    (choiceIndex: number) => {
      const cur = rtRef.current;
      if (!cur || !model) return;
      pushHistory(cur);
      const chosen = chooseStep(cur, model.files, choiceIndex);
      const result = continueStep(
        chosen,
        model.files,
        model.knots,
        model.variables,
      );
      applyResult(result, chosen);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [model],
  );

  const back = useCallback(() => {
    if (history.length === 0) return;
    const cur = rtRef.current;
    const snap = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    // 回退：恢复快照中的显示行/选项/立绘/场景，bg/bgm 副作用保持当前值
    updateRt({
      ...snap,
      displayLine: snap.displayLine,
      choices: snap.choices,
      portrait: snap.portrait,
      sceneCard: snap.sceneCard,
      bg: cur?.bg ?? null,
      bgm: cur?.bgm ?? null,
      ended: false,
    });
  }, [history]);

  const reset = useCallback(() => {
    if (!model) return;
    setHistory([]);
    setLastRolls([]);
    if (model.entryError || !model.entry) {
      updateRt(null);
      return;
    }
    const fm = model.files.get(model.entry.file)?.frontmatter ?? {};
    const state = createInitialState({
      file: model.entry.file,
      knot: model.entry.knot,
      pc: model.entry.pc,
      variables: model.variables,
      bg: fm.bg ?? null,
      bgm: fm.bgm ?? null,
    });
    pump(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const setValue = useCallback((key: string, val: unknown) => {
    const cur = rtRef.current;
    if (!cur) return;
    updateRt({ ...cur, values: { ...cur.values, [key]: val } });
  }, []);

  const resetVars = useCallback(() => {
    const cur = rtRef.current;
    if (!cur || !model) return;
    const init: Record<string, unknown> = {};
    for (const v of model.variables) init[v.key] = v.default ?? null;
    updateRt({ ...cur, values: init });
  }, [model]);

  // 结局标记取当前文件 frontmatter
  const currentFm =
    rt?.file !== null && rt && model
      ? (model.files.get(rt.file)?.frontmatter ?? {})
      : {};

  return {
    loading,
    loadError,
    entryError: model?.entryError ?? null,
    hasContent: (model?.files.size ?? 0) > 0,
    state: rt,
    values: rt?.values ?? {},
    setValue,
    resetVars,
    variables: model?.variables ?? [],
    history,
    lastRolls,
    currentKnot: rt?.knot ?? null,
    currentBg: rt?.bg ?? null,
    currentBgm: rt?.bgm ?? null,
    currentSfx: sfx,
    choices: rt?.choices ?? [],
    currentLine: rt?.displayLine ?? null,
    ended: rt?.ended ?? false,
    isEnding: Boolean(currentFm.is_ending),
    endingName: currentFm.ending_name ?? null,
    portrait: rt?.portrait ?? null,
    portraitLookup,
    cards: model?.cards ?? [],
    currentSceneCard,
    duplicates: model?.duplicates ?? [],
    // 编辑器侧大纲跳转用
    jumpToKnot: (knot: string) => {
      if (!model) return;
      const hit = model.knots.get(knot);
      const cur = rtRef.current;
      if (!hit || !cur) return;
      pushHistory(cur);
      const next: RuntimeState = {
        ...cur,
        file: hit.file,
        knot,
        pc: hit.pc,
        choiceBodyEnd: null,
        gatherPc: null,
        currentChoiceGroupStart: null,
        choices: [],
        displayLine: null,
        portrait: null,
        ended: false,
      };
      pump(next);
    },
    advance,
    choose,
    back,
    reset,
    model,
  };
}

/** 供导出 / 调试：显示行文本。 */
export function lineTextOf(line: ScriptLine | null): string | null {
  return line && "text" in line ? line.text : null;
}
