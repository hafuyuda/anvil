import { describe, expect, it } from "vitest";
import { parseScript } from "../../script/parser";
import type { ParsedScript, ScriptLine } from "../../script/types";
import {
  MAX_STEPS,
  buildKnotIndex,
  chooseStep,
  continueStep,
  createInitialState,
  varsToVariables,
  type KnotIndex,
} from "../runtime";

/** 显示行文本（非显示行 / 无状态返回 null）。 */
function shown(result: {
  state: { displayLine: ScriptLine | null } | null;
}): string | null {
  const l = result.state?.displayLine ?? null;
  return l && "text" in l ? l.text : null;
}

function makeFiles(entries: [string, string][]): Map<string, ParsedScript> {
  const files = new Map<string, ParsedScript>();
  for (const [name, src] of entries) files.set(name, parseScript(src));
  return files;
}

/** files 变量集 + knot 索引 + 入口初始状态（第一个文件的第一个 knot）。 */
function boot(entries: [string, string][]) {
  const files = makeFiles(entries);
  const first = files.values().next().value as ParsedScript;
  const variables = varsToVariables(
    [...files.values()].flatMap((f) => f.vars),
  );
  const { knots } = buildKnotIndex(files);
  const entry = Object.keys(first.knots)[0];
  const target = knots.get(entry);
  if (!target) throw new Error("测试剧本没有 knot");
  const state = createInitialState({
    file: target.file,
    knot: entry,
    pc: target.pc,
    variables,
  });
  return { files, knots: knots as KnotIndex, variables, state };
}

describe("runtime", () => {
  it("visited 自增：进入 knot 两次后 visited_名 === 2", () => {
    const { files, knots, variables, state } = boot([
      ["main.md", ["=== 营地", "> 你醒来。", "-> 营地"].join("\n")],
    ]);

    const first = continueStep(state, files, knots, variables);
    expect(first.error).toBeNull();
    expect(first.state?.visited["营地"]).toBe(1);

    const second = continueStep(first.state!, files, knots, variables);
    expect(second.error).toBeNull();
    expect(second.state?.visited["营地"]).toBe(2);
  });

  it("choice 选择：选 index 0，pc 落到该 choice bodyStart", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        ["=== 起点", "* 走左边", "> 左边小路。", "* 走右边", "> 右边小路。", "- 汇合。"].join("\n"),
      ],
    ]);

    const atChoice = continueStep(state, files, knots, variables);
    expect(atChoice.state?.choices).toEqual([
      { label: "走左边", index: 0 },
      { label: "走右边", index: 1 },
    ]);

    const chosen = chooseStep(atChoice.state!, files, 0);
    expect(chosen.pc).toBe(2);
    expect(chosen.choiceBodyEnd).toBe(2);
    expect(chosen.gatherPc).toBe(5);
  });

  it("gather 汇合：choice body 执行完自然落到 gather", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        ["=== 起点", "* 走左边", "> 左边小路。", "* 走右边", "> 右边小路。", "- 汇合。"].join("\n"),
      ],
    ]);

    const atChoice = continueStep(state, files, knots, variables);
    const chosen = chooseStep(atChoice.state!, files, 1);
    const body = continueStep(chosen, files, knots, variables);
    expect(shown(body)).toBe("右边小路。");

    const merged = continueStep(body.state!, files, knots, variables);
    expect(shown(merged)).toBe("汇合。");
    expect(merged.state?.choiceBodyEnd).toBeNull();
    expect(merged.state?.gatherPc).toBeNull();
  });

  it("跨文件跳转：-> 目标 更新 file 与 pc", () => {
    const { files, knots, variables, state } = boot([
      ["a.md", ["=== 起点", "> 在营地。", "-> 洞穴"].join("\n")],
      ["b.md", ["=== 洞穴", "> 洞穴里很黑。", "-> END"].join("\n")],
    ]);

    const first = continueStep(state, files, knots, variables);
    expect(shown(first)).toBe("在营地。");

    const jumped = continueStep(first.state!, files, knots, variables);
    expect(jumped.error).toBeNull();
    expect(jumped.state?.file).toBe("b.md");
    expect(jumped.state?.knot).toBe("洞穴");
    expect(shown(jumped)).toBe("洞穴里很黑。");
  });

  it("-> END：ended 为 true，无显示行", () => {
    const { files, knots, variables, state } = boot([
      ["main.md", ["=== 终点", "> 天亮了。", "-> END"].join("\n")],
    ]);

    const first = continueStep(state, files, knots, variables);
    expect(shown(first)).toBe("天亮了。");

    const ended = continueStep(first.state!, files, knots, variables);
    expect(ended.error).toBeNull();
    expect(ended.state?.ended).toBe(true);
    expect(ended.state?.displayLine).toBeNull();
    expect(ended.state?.choices).toEqual([]);
  });

  it("循环保护：超过 1000 步报错，不挂死", () => {
    const { files, knots, variables, state } = boot([
      ["main.md", ["=== 自身", "-> 自身"].join("\n")],
    ]);

    const result = continueStep(state, files, knots, variables);
    expect(result.error).toContain(String(MAX_STEPS));
    expect(result.state).toBeNull();
  });

  it("行内条件求值：真值取 then，假值取 else", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        ["VAR gold = 0", "=== 集市", "{gold > 5: 你买得起。| 你买不起。}"].join("\n"),
      ],
    ]);

    const poor = continueStep(state, files, knots, variables);
    expect(shown(poor)).toBe("你买不起。");

    const richState = { ...state, values: { ...state.values, gold: 10 } };
    const rich = continueStep(richState, files, knots, variables);
    expect(shown(rich)).toBe("你买得起。");
  });

  it("立绘状态：say 行记录说话人+表情，跨 narration 保持", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        [
          "=== 对话",
          "**艾琳**（愤怒）：你竟敢！",
          "> 她转身离去。",
        ].join("\n"),
      ],
    ]);

    const say = continueStep(state, files, knots, variables);
    expect(shown(say)).toBe("你竟敢！");
    expect(say.state?.portrait).toEqual({ speaker: "艾琳", emotion: "愤怒" });

    const narr = continueStep(say.state!, files, knots, variables);
    expect(shown(narr)).toBe("她转身离去。");
    // 旁白不改变当前立绘
    expect(narr.state?.portrait).toEqual({ speaker: "艾琳", emotion: "愤怒" });
  });

  it("场景卡状态：@scene 与 knot scene 字段写入 sceneCard", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        ["=== 酒馆", "@scene 酒馆大厅", "**老板**：欢迎光临。"].join("\n"),
      ],
    ]);

    const atScene = continueStep(state, files, knots, variables);
    expect(atScene.state?.sceneCard).toBe("酒馆大厅");
    expect(atScene.state?.portrait).toEqual({ speaker: "老板", emotion: undefined });
  });

  it("回退恢复：HistoryEntry 含 displayLine，back 后显示上一句而非空白", () => {
    const { files, knots, variables, state } = boot([
      [
        "main.md",
        ["=== 序", "> 第一句。", "> 第二句。"].join("\n"),
      ],
    ]);

    const first = continueStep(state, files, knots, variables);
    expect(shown(first)).toBe("第一句。");
    // 模拟推进时入栈：快照保存当前显示行
    const snap = {
      ...first.state!,
      displayLine: first.state!.displayLine,
      choices: first.state!.choices,
      portrait: first.state!.portrait,
      sceneCard: first.state!.sceneCard,
    };
    const second = continueStep(first.state!, files, knots, variables);
    expect(shown(second)).toBe("第二句。");

    // back：用快照还原（与 usePlayState.back 行为一致）
    const restored = { ...snap, bg: second.state!.bg, bgm: second.state!.bgm, ended: false };
    expect(restored.displayLine && "text" in restored.displayLine
      ? restored.displayLine.text
      : null,
    ).toBe("第一句。");
  });
});
