import type { VariableDef } from "../../../core/ipc";
import { evalCondition } from "../script/eval";
import { parseInlineInner } from "../script/parser";
import type { ParsedScript, ScriptLine } from "../script/types";
import { applyEffects, type AppliedEffect, type ParsedEffect } from "../effects";

/** 两态机运行时状态。 */
export interface RuntimeState {
  file: string | null;
  knot: string | null;
  pc: number;
  values: Record<string, unknown>;
  visited: Record<string, number>;
  displayLine: ScriptLine | null;
  choices: { label: string; index: number }[];
  currentChoiceGroupStart: number | null;
  choiceBodyEnd: number | null;
  gatherPc: number | null;
  bg: string | null;
  bgm: string | null;
  glue: boolean;
  ended: boolean;
}

/** 回溯快照：推进产生的中间值（displayLine / choices / bg / bgm / ended）不入栈。 */
export interface HistoryEntry {
  file: string | null;
  knot: string | null;
  pc: number;
  values: Record<string, unknown>;
  visited: Record<string, number>;
  currentChoiceGroupStart: number | null;
  choiceBodyEnd: number | null;
  gatherPc: number | null;
  glue: boolean;
}

export interface StepResult {
  state: RuntimeState | null;
  sfx: string[];
  rolls: AppliedEffect[];
  error: string | null;
}

/** 跨文件 knot 索引：knot 名 → 所在文件与行号。 */
export type KnotIndex = Map<string, { file: string; pc: number }>;

/** 单次推进的步数上限，防死循环。 */
export const MAX_STEPS = 1000;

/**
 * 跨文件 knot 索引。按文件名字典序构建（调用方保证 Map 插入顺序），
 * 重名 knot 后加载的覆盖先加载的，名字记入 duplicates 供调用方警告。
 */
export function buildKnotIndex(files: Map<string, ParsedScript>): {
  knots: KnotIndex;
  duplicates: string[];
} {
  const knots: KnotIndex = new Map();
  const duplicates: string[] = [];
  for (const [filename, script] of files) {
    for (const name of Object.keys(script.knots)) {
      if (knots.has(name)) duplicates.push(name);
      const k = script.knots[name];
      knots.set(name, { file: filename, pc: k.pc });
    }
  }
  return { knots, duplicates };
}

/**
 * VAR 声明 → VariableDef。跨文件同名视为同一变量，首次声明生效。
 * 字面量推断：数字 → number、true/false → bool、其余 → text。
 */
export function varsToVariables(
  vars: { key: string; literal: string }[],
): VariableDef[] {
  const out: VariableDef[] = [];
  const seen = new Set<string>();
  for (const v of vars) {
    if (seen.has(v.key)) continue;
    seen.add(v.key);
    out.push(varToDef(v));
  }
  return out;
}

function varToDef(v: { key: string; literal: string }): VariableDef {
  const lit = v.literal.trim();
  if (/^-?\d+(\.\d+)?$/.test(lit)) {
    return {
      key: v.key,
      label: v.key,
      ty: { kind: "number" },
      default: Number(lit),
    };
  }
  if (lit === "true" || lit === "false") {
    return {
      key: v.key,
      label: v.key,
      ty: { kind: "bool" },
      default: lit === "true",
    };
  }
  return {
    key: v.key,
    label: v.key,
    ty: { kind: "text" },
    default: stripQuotes(lit),
  };
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

/** 变量初始值：VariableDef.default（无 default 时 null）。 */
export function initValues(
  variables: VariableDef[],
): Record<string, unknown> {
  const init: Record<string, unknown> = {};
  for (const v of variables) init[v.key] = v.default ?? null;
  return init;
}

/**
 * 初始状态：file / knot / pc 指向入口 knot，visited 为空——
 * 入口 knot 的 visited 计数由首次 continueStep 扫到 knot 行时建立。
 */
export function createInitialState(args: {
  file: string;
  knot: string;
  pc: number;
  variables: VariableDef[];
  bg?: string | null;
  bgm?: string | null;
}): RuntimeState {
  return {
    file: args.file,
    knot: args.knot,
    pc: args.pc,
    values: initValues(args.variables),
    visited: {},
    displayLine: null,
    choices: [],
    currentChoiceGroupStart: null,
    choiceBodyEnd: null,
    gatherPc: null,
    bg: args.bg ?? null,
    bgm: args.bgm ?? null,
    glue: false,
    ended: false,
  };
}

/**
 * 推进一步：从当前 pc 扫描指令行直到产生显示行 / 选项组 / 结束 / 错误。
 * 纯函数，不碰 IO。
 */
export function continueStep(
  state: RuntimeState,
  files: Map<string, ParsedScript>,
  knots: KnotIndex,
  variables: VariableDef[],
): StepResult {
  let { file, knot, pc } = state;
  let { values, visited, displayLine, glue } = state;
  let { currentChoiceGroupStart, choiceBodyEnd, gatherPc } = state;
  let { bg, bgm } = state;
  const sfx: string[] = [];
  const rolls: AppliedEffect[] = [];

  // 从当前局部量构造一致的状态快照
  const snap = (overrides: Partial<RuntimeState> = {}): RuntimeState => ({
    file,
    knot,
    pc,
    values,
    visited,
    displayLine,
    choices: [],
    currentChoiceGroupStart,
    choiceBodyEnd,
    gatherPc,
    bg,
    bgm,
    glue,
    ended: false,
    ...overrides,
  });

  for (let i = 0; i < MAX_STEPS; i++) {
    // choice body 结束检测：跳到 gather 或自然汇合
    if (choiceBodyEnd !== null && pc > choiceBodyEnd) {
      if (gatherPc !== null) {
        pc = gatherPc;
        choiceBodyEnd = null;
        gatherPc = null;
        currentChoiceGroupStart = null;
        continue;
      }
      choiceBodyEnd = null;
      gatherPc = null;
      currentChoiceGroupStart = null;
    }

    const script = file !== null ? files.get(file) : undefined;
    if (!script) {
      return { state: null, sfx, rolls, error: `文件 ${file} 不存在` };
    }
    const line = script.lines[pc];
    if (!line) {
      // EOF：剧情结束
      return {
        state: snap({
          displayLine: null,
          currentChoiceGroupStart: null,
          choiceBodyEnd: null,
          gatherPc: null,
          ended: true,
        }),
        sfx,
        rolls,
        error: null,
      };
    }

    switch (line.type) {
      case "knot":
        visited = { ...visited, [line.name]: (visited[line.name] ?? 0) + 1 };
        knot = line.name;
        pc++;
        break;

      case "var":
        pc++;
        break;

      case "assign": {
        const result = applyEffects(values, [toEffect(line)], variables);
        values = result.values;
        rolls.push(...result.applied.filter((a) => a.isRoll));
        pc++;
        break;
      }

      case "condition":
        if (evalCondition(line.expr, values, visited) && line.text) {
          displayLine = mergeGlue(glue, displayLine, line);
          glue = false;
          return {
            state: snap({ pc: pc + 1, displayLine, glue }),
            sfx,
            rolls,
            error: null,
          };
        }
        pc++;
        break;

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

      case "scene_ref":
      case "actor_ref":
        pc++;
        break;

      case "jump": {
        if (line.target === "END") {
          return {
            state: snap({
              displayLine: null,
              currentChoiceGroupStart: null,
              choiceBodyEnd: null,
              gatherPc: null,
              ended: true,
            }),
            sfx,
            rolls,
            error: null,
          };
        }
        const target = knots.get(line.target);
        if (!target) {
          return { state: null, sfx, rolls, error: `找不到 knot：${line.target}` };
        }
        file = target.file;
        pc = target.pc;
        choiceBodyEnd = null;
        gatherPc = null;
        currentChoiceGroupStart = null;
        break;
      }

      case "choice": {
        const group = script.choiceGroups[pc];
        if (!group) {
          pc++;
          break;
        }
        return {
          state: snap({
            choices: group.choices.map((c, idx) => ({ label: c.label, index: idx })),
            currentChoiceGroupStart: pc,
            choiceBodyEnd: null,
            gatherPc: null,
          }),
          sfx,
          rolls,
          error: null,
        };
      }

      case "gather":
        if (line.text) {
          displayLine = mergeGlue(glue, displayLine, line);
          glue = false;
          return {
            state: snap({
              pc: pc + 1,
              displayLine,
              glue,
              currentChoiceGroupStart: null,
              choiceBodyEnd: null,
              gatherPc: null,
            }),
            sfx,
            rolls,
            error: null,
          };
        }
        pc++;
        break;

      default: {
        const resolved = resolveInline(line, values, visited);
        displayLine = mergeGlue(glue, displayLine, resolved);
        glue = false;
        return {
          state: snap({ pc: pc + 1, displayLine, glue }),
          sfx,
          rolls,
          error: null,
        };
      }
    }
  }

  return { state: null, sfx, rolls, error: `剧本推进超过 ${MAX_STEPS} 步` };
}

/**
 * 选择一个选项：pc 落到该选项 body 起点，记录 body 终点与 gather 位置。
 * 只改 pc 与 choiceBodyEnd / gatherPc / currentChoiceGroupStart。
 */
export function chooseStep(
  state: RuntimeState,
  files: Map<string, ParsedScript>,
  choiceIndex: number,
): RuntimeState {
  const script = state.file !== null ? files.get(state.file) : undefined;
  const group =
    script && state.currentChoiceGroupStart !== null
      ? script.choiceGroups[state.currentChoiceGroupStart]
      : undefined;
  const choice = group?.choices[choiceIndex];
  if (!group || !choice) return state;
  return {
    ...state,
    pc: choice.bodyStart,
    choiceBodyEnd: choice.bodyEnd,
    gatherPc: group.gatherPc,
    choices: [],
  };
}

/** 粘合：下一显示行与上一显示行拼接（换行连接，保留上一行的类型）。 */
export function mergeGlue(
  glue: boolean,
  prev: ScriptLine | null,
  line: ScriptLine,
): ScriptLine {
  if (glue && prev && "text" in prev && "text" in line) {
    return { ...prev, text: `${prev.text}\n${line.text}` };
  }
  return line;
}

/**
 * 行内条件渲染前求值：按源码位置扫描 `{...}` 跨度，逐个与 line.inline
 * 对齐求值替换。非条件跨度（如 `{术语}`）原样保留。
 */
function resolveInline(
  line: ScriptLine,
  values: Record<string, unknown>,
  visited: Record<string, number>,
): ScriptLine {
  if (line.type !== "narration" && line.type !== "say" && line.type !== "action") {
    return line;
  }
  const inline = line.inline;
  if (!inline || inline.length === 0) return line;

  const text = line.text;
  let out = "";
  let spanIdx = 0;
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) {
      out += text.slice(i);
      break;
    }
    const close = text.indexOf("}", open + 1);
    if (close === -1) {
      out += text.slice(i);
      break;
    }
    const cond = parseInlineInner(text.slice(open + 1, close));
    if (!cond) {
      out += text.slice(i, close + 1);
      i = close + 1;
      continue;
    }
    out += text.slice(i, open);
    spanIdx++;
    out += String(
      evalCondition(cond.expr, values, visited) ? cond.then : cond.else,
    );
    i = close + 1;
  }

  const resolved: ScriptLine = { ...line, text: out };
  if ("inline" in resolved) delete resolved.inline;
  return resolved;
}

function toEffect(line: Extract<ScriptLine, { type: "assign" }>): ParsedEffect {
  return {
    key: line.key,
    op: line.op,
    rawValue: line.value,
    raw: `~ ${line.key} ${line.op} ${line.value}`,
  };
}
