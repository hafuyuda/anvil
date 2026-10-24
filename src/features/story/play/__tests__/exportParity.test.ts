/**
 * 导出阅读器与预览运行时的对拍。
 *
 * 历史问题：剧本语义曾有三份实现——编辑态 parser、预览态 runtime、
 * 导出态 export_html.rs 内嵌的独立 JS（外加 Rust 里一份 VAR 类型推断）。
 * 前三者语义漂移后，作者试玩正常、读者打开导出件却不同。
 *
 * 现在语义只有一份：`src/features/story/engine`。导出件内联的是它的
 * 打包产物 `src-tauri/src/core/store/reader_runtime.js`。因此本测试做两件事：
 *
 * 1. **产物新鲜度**：重新构建并与仓库里的产物逐字节比对，防止「改了 TS
 *    忘了重新打包」这种静默过期；
 * 2. **行为对拍**：直接执行产物原文（不是复制品），与预览路径跑同一批
 *    剧本，逐帧比对显示行 / 选项 / 变量 / visited / bg/bgm / 结束 / 错误。
 *
 * 约定：预览路径（engine/machine + engine/reader 的加载顺序）是参考实现。
 */
import { describe, expect, it, vi } from "vitest";
import bundleSource from "../../../../../src-tauri/src/core/store/reader_runtime.js?raw";
import varDefs from "./fixtures/varDefs.json";
import { parseScript } from "../../script/parser";
import type { ParsedScript } from "../../script/types";
import {
  buildKnotIndex,
  chooseStep,
  continueStep,
  createInitialState,
  varsToVariables,
  type KnotIndex,
  type RuntimeState,
} from "../../engine";

// ---------------------------------------------------------------------------
// 1. 产物形状
//
//    新鲜度由 `pnpm test` 前置的 `check:runtime`（重新构建并逐字节比对）保证，
//    这里只钉住「产物必须是引擎的打包结果，不能退回手写实现」。
// ---------------------------------------------------------------------------

describe("导出引擎产物", () => {
  it("是引擎的打包产物（含 GENERATED 头与 createReader 出口）", () => {
    expect(bundleSource).toContain("GENERATED FILE — DO NOT EDIT");
    expect(bundleSource).toMatch(/exports\.createReader = createReader/);
  });

  it("产物不引用 DOM / Node 运行时（必须能内联进纯静态 HTML）", () => {
    expect(bundleSource).not.toMatch(/\bdocument\./);
    expect(bundleSource).not.toMatch(/\bwindow\./);
    expect(bundleSource).not.toMatch(/\brequire\(/);
    expect(bundleSource).not.toMatch(/^\s*import\s/m);
  });
});

// ---------------------------------------------------------------------------
// 2. 行为对拍
// ---------------------------------------------------------------------------

interface BundleReader {
  variables: { key: string; default?: unknown }[];
  state: Record<string, unknown> | null;
  initialError: string | null;
  reset: () => {
    state: Record<string, unknown> | null;
    error: string | null;
  };
  continue: () => {
    state: Record<string, unknown> | null;
    error: string | null;
  };
  choose: (index: number) => Record<string, unknown> | null;
  frontmatter: (file?: string | null) => Record<string, unknown>;
}

interface BundleApi {
  createReader: (source: {
    scenario: { entry_knot: string | null };
    files: Record<string, string[]>;
  }) => BundleReader;
}

/** 执行产物原文并取回其全局导出（IIFE 的返回值）。 */
function loadBundle(): BundleApi {
  return new Function(`${bundleSource}\nreturn AnvilReader;`)() as BundleApi;
}

function toLines(content: string): string[] {
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

interface TraceFrame {
  file: unknown;
  knot: unknown;
  pc: unknown;
  values: unknown;
  visited: unknown;
  line: { type: string; text: string; speaker?: string } | null;
  choices: string[];
  ended: boolean;
  bg: unknown;
  bgm: unknown;
  error: string | null;
}

function frameFrom(
  state: Record<string, unknown> | null,
  error: string | null,
): TraceFrame {
  const line = state?.displayLine as
    { type: string; text?: string; speaker?: string } | null | undefined;
  const choices = (state?.choices as { label: string }[] | undefined) ?? [];
  return {
    file: state?.file ?? null,
    knot: state?.knot ?? null,
    pc: state?.pc ?? null,
    values: state?.values ?? null,
    visited: state?.visited ?? null,
    line: line
      ? {
          type: line.type,
          text: line.text ?? "",
          ...(line.speaker !== undefined ? { speaker: line.speaker } : {}),
        }
      : null,
    choices: choices.map((c) => c.label),
    ended: Boolean(state?.ended),
    bg: state?.bg ?? null,
    bgm: state?.bgm ?? null,
    error,
  };
}

interface Fixture {
  /** 文件名 → 剧本内容，按字典序作为加载顺序 */
  files: Record<string, string>;
  entryKnot: string | null;
  /** 依次在选项组里选的序号；用尽后取 0 */
  picks?: number[];
}

interface RunResult {
  frames: TraceFrame[];
  state: { values: Record<string, unknown> } | null;
}

function runPreview(fixture: Fixture): {
  result: RunResult;
  variables: ReturnType<typeof varsToVariables>;
  knots: KnotIndex;
} {
  const parsed = new Map<string, ParsedScript>();
  for (const name of Object.keys(fixture.files).sort()) {
    parsed.set(name, parseScript(fixture.files[name]));
  }
  const { knots } = buildKnotIndex(parsed);
  const variables = varsToVariables(
    [...parsed.values()].flatMap((f) => f.vars),
  );

  let entry: { file: string; knot: string; pc: number } | null = null;
  if (fixture.entryKnot) {
    const hit = knots.get(fixture.entryKnot);
    if (hit) entry = { file: hit.file, knot: fixture.entryKnot, pc: hit.pc };
  } else {
    const firstFile = parsed.keys().next();
    if (!firstFile.done) {
      const script = parsed.get(firstFile.value);
      const firstKnot = script
        ? Object.keys(script.knots).sort()[0]
        : undefined;
      if (script && firstKnot) {
        entry = {
          file: firstFile.value,
          knot: firstKnot,
          pc: script.knots[firstKnot].pc,
        };
      }
    }
  }

  if (!entry) {
    return {
      result: { frames: [], state: null },
      variables,
      knots,
    };
  }

  const fm = parsed.get(entry.file)?.frontmatter ?? {};
  let state: RuntimeState = createInitialState({
    file: entry.file,
    knot: entry.knot,
    pc: entry.pc,
    variables,
    bg: fm.bg ?? null,
    bgm: fm.bgm ?? null,
  });

  const picks = [...(fixture.picks ?? [])];
  const frames: TraceFrame[] = [];
  for (let i = 0; i < 80; i++) {
    const r = continueStep(state, parsed, knots, variables);
    frames.push(frameFrom(r.state as Record<string, unknown> | null, r.error));
    if (r.error || !r.state) break;
    state = r.state;
    if (state.ended) break;
    if (state.choices.length > 0) {
      state = chooseStep(state, parsed, picks.shift() ?? 0);
    }
  }
  return {
    result: { frames, state: { values: state.values } },
    variables,
    knots,
  };
}

/** 走导出件路径：输入只有「文件原文 + entry_knot」，变量表由引擎自己推。 */
function runExport(fixture: Fixture): RunResult {
  const files: Record<string, string[]> = {};
  for (const name of Object.keys(fixture.files).sort()) {
    files[name] = toLines(fixture.files[name]);
  }
  const reader = loadBundle().createReader({
    scenario: { entry_knot: fixture.entryKnot },
    files,
  });
  if (reader.initialError) return { frames: [], state: null };

  const picks = [...(fixture.picks ?? [])];
  const frames: TraceFrame[] = [];
  for (let i = 0; i < 80; i++) {
    const r = reader.continue();
    frames.push(frameFrom(r.state, r.error));
    if (r.error || !r.state) break;
    if (r.state.ended) break;
    const choices = (r.state.choices as unknown[]) ?? [];
    if (choices.length > 0) reader.choose(picks.shift() ?? 0);
  }
  const values = reader.state?.values as Record<string, unknown> | undefined;
  return { frames, state: { values: values ?? {} } };
}

function expectParity(fixture: Fixture): RunResult {
  const preview = runPreview(fixture).result;
  const exported = runExport(fixture);
  expect(exported.frames).toEqual(preview.frames);
  expect(exported.state?.values).toEqual(preview.state?.values);
  return preview;
}

/** 确定性随机源，两侧各取一份同种子序列。 */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("导出阅读器与预览对拍", () => {
  it("基本行类型：旁白 / 对白 / 动作 / 粘合 / 汇合", () => {
    const preview = expectParity({
      entryKnot: null,
      files: {
        "main.md": [
          "=== 开场",
          "> 铁砧在炉火里发红。",
          "**铁匠**（冷漠）：你又要打什么？",
          "> 他没抬头。",
          "<>",
          "*他抬起锤子*",
          "- 汇合点",
          "> 结束了。",
        ].join("\n"),
      },
    });
    expect(preview.frames.map((f) => f.line?.text)).toContain(
      "他没抬头。\n他抬起锤子",
    );
  });

  it("选项组：连续选项、body 边界、gather 汇合", () => {
    expectParity({
      entryKnot: null,
      picks: [1, 0],
      files: {
        "main.md": [
          "=== 开场",
          "* 收下钱",
          "> 你收下了。",
          "~ gold += 10",
          "* 拒绝",
          "> 你摇了摇头。",
          "- 他叹了口气。",
          "* 再谈一次",
          "> 你试着压价。",
          "* 走人",
          "-> END",
          "- 门在你身后关上。",
          "> 完。",
        ].join("\n"),
      },
    });
  });

  it("变量：number / bool / text 的赋值与算术", () => {
    const preview = expectParity({
      entryKnot: null,
      files: {
        "vars.md": [
          "=== 开局",
          "VAR gold = 10",
          'VAR name = "旅人"',
          "VAR brave = true",
          "~ gold += 5",
          "~ gold -= 3",
          '~ name += "·阿德"',
          "~ brave = false",
          "> 完成。",
        ].join("\n"),
      },
    });
    expect(preview.state?.values).toEqual({
      gold: 12,
      name: "旅人·阿德",
      brave: false,
    });
  });

  it("未知变量赋值：两侧都不创建新变量", () => {
    const preview = expectParity({
      entryKnot: null,
      files: {
        "unknown.md": ["=== 开局", "VAR a = 1", "~ ghost = 5", "> 完成。"].join(
          "\n",
        ),
      },
    });
    expect(preview.state?.values).toEqual({ a: 1 });
  });

  it("条件：数值比较、数值字符串、逻辑与括号", () => {
    expectParity({
      entryKnot: null,
      files: {
        "cond.md": [
          "=== 开局",
          "VAR gold = 100",
          "VAR flag = true",
          'VAR label = "10"',
          "{gold >= 100: 有钱。}",
          "{gold < 100: 没钱。}",
          "{label > 9: 字符串按数值比。}",
          '{label > "9": 字符串按字典序比。}',
          "{flag && (gold == 100 || false): 组合为真。}",
          "{!flag: 不该出现。}",
          "> 完。",
        ].join("\n"),
      },
    });
  });

  it("行内条件：真分支、假分支、非条件跨度原样保留", () => {
    expectParity({
      entryKnot: null,
      files: {
        "inline.md": [
          "=== 开局",
          "VAR met = true",
          "> 他{met: 认得|不认得}你，{术语}照旧。",
          "**铁匠**（笑）：{met: 又见面了|初次见面}。",
        ].join("\n"),
      },
    });
  });

  it("跨文件跳转与 END", () => {
    expectParity({
      entryKnot: "第一章",
      files: {
        "a.md": ["=== 第一章", "> 甲的正文。", "-> 第二章"].join("\n"),
        "b.md": ["=== 第二章", "> 乙的正文。", "-> END"].join("\n"),
      },
    });
  });

  it("赋值里的骰子表达式：多骰项与修正", () => {
    const fixture: Fixture = {
      entryKnot: null,
      files: {
        "dice.md": [
          "=== 开局",
          "VAR hp = 20",
          "VAR roll = 0",
          "~ hp -= 1d6+1d4",
          "~ roll = 2d20kh1+5",
          "> 完成。",
        ].join("\n"),
      },
    };

    const spy = vi.spyOn(Math, "random").mockImplementation(makeRng(20261020));
    let preview: RunResult;
    try {
      preview = runPreview(fixture).result;
    } finally {
      spy.mockRestore();
    }

    const spy2 = vi.spyOn(Math, "random").mockImplementation(makeRng(20261020));
    let exported: RunResult;
    try {
      exported = runExport(fixture);
    } finally {
      spy2.mockRestore();
    }

    expect(exported.frames).toEqual(preview.frames);
    expect(exported.state?.values).toEqual(preview.state?.values);
    const hp = (preview.state?.values as { hp: number }).hp;
    expect(hp).toBeLessThan(20);
  });

  it("非法条件表达式：两侧都不中断，按假处理", () => {
    const preview = expectParity({
      entryKnot: null,
      files: {
        "bad.md": [
          "=== 开局",
          "VAR a = 1",
          "{a ** 2: 语法错误行}",
          "> 仍然继续。",
        ].join("\n"),
      },
    });
    expect(preview.frames.every((f) => f.error === null)).toBe(true);
    expect(preview.frames.map((f) => f.line?.text)).toContain("仍然继续。");
  });

  it("入口 knot：显式写错时给出错误，而不是静默从头开始", () => {
    const reader = loadBundle().createReader({
      scenario: { entry_knot: "不存在的章" },
      files: { "a.md": toLines(["=== 第一章", "> 甲。"].join("\n")) },
    });
    expect(reader.initialError).toBe("找不到入口 knot：不存在的章");
    expect(reader.state).toBeNull();
    const r = reader.continue();
    expect(r.error).toBe("找不到入口 knot：不存在的章");
  });

  it("无显式入口时回退到字典序第一个文件里字典序最小的 knot", () => {
    // 首文件 a.md 内两个 knot：「乙章」(U+4E59) < 「甲章」(U+7532)
    const reader = loadBundle().createReader({
      scenario: { entry_knot: null },
      files: {
        "a.md": toLines(
          ["=== 乙章", "> 乙。", "=== 甲章", "> 甲。"].join("\n"),
        ),
        "b.md": toLines(["=== 丙章", "> 丙。"].join("\n")),
      },
    });
    expect(reader.state?.knot).toBe("乙章");
    expect(reader.state?.file).toBe("a.md");
  });
});

/**
 * 变量类型推断的契约表。曾经同时被 Rust 的 `var_to_def` 读取，
 * 用来防止「导出把 1e3 当数字、预览当文本」。Rust 那份实现已删除
 * （导出改用引擎），契约仍保留：它是语言规则的可执行说明。
 */
describe("VAR 声明类型推断", () => {
  interface VarCase {
    line: string;
    key: string | null;
    ty?: string;
    default?: unknown;
  }
  const cases = (varDefs as unknown as { cases: VarCase[] }).cases;

  for (const c of cases) {
    it(c.line, () => {
      const parsed = parseScript(`=== k\n${c.line}`);
      if (c.key === null) {
        expect(parsed.vars).toEqual([]);
        return;
      }
      expect(parsed.vars).toHaveLength(1);
      const def = varsToVariables(parsed.vars)[0];
      expect(def.key).toBe(c.key);
      expect(def.ty.kind).toBe(c.ty);
      expect(def.default).toBe(c.default);
    });
  }
});
