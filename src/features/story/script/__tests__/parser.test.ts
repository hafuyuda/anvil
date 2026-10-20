import { describe, expect, it } from "vitest";
import { parseScript } from "../parser";
import { serializeScript } from "../serializer";
import type { ScriptLine } from "../types";

describe("parser", () => {
  it("新语法往返：parse → serialize → parse，lines 逐项相等", () => {
    const source = `---
bg: assets/images/铁匠铺内部.png
bgm: assets/audio/炉火.mp3
is_ending: false
ending_name: 静默新月
---

VAR gold = 0
VAR has_key = false

=== 开场
> 炉火噼啪作响。

**布洛克**（neutral）：坐吧，旅人。

=== 铁匠铺
@scene 铁匠铺
@actor 布洛克
@actor 格蕾塔

* 查看炉火
> 炉火正旺，铁砧上放着半成品。
~ gold += 1

* 和布洛克交谈
-> 对话

* 离开
-> 城门口

- 你最终离开了铁匠铺。

=== 对话
**布洛克**：你想买什么？

* 买剑
{has_key: 你掏出钥匙。| 你没有钥匙。}
~ gold -= 10

* 离开
-> 铁匠铺

- 对话结束。

=== 城门口
> 天亮时，你到了城门口。
-> END
`;

    const first = parseScript(source);
    const roundTrip = parseScript(serializeScript(first));

    expect(roundTrip.lines).toEqual(first.lines);
    expect(roundTrip.vars).toEqual([
      { key: "gold", literal: "0" },
      { key: "has_key", literal: "false" },
    ]);
  });

  it("knot 索引：每个 knot 的 pc 正确", () => {
    const parsed = parseScript(
      ["=== 开场", "> 文本", "=== 铁匠铺", "@actor 布洛克"].join("\n"),
    );

    expect(Object.keys(parsed.knots)).toEqual(["开场", "铁匠铺"]);
    expect(parsed.knots["开场"].pc).toBe(0);
    expect(parsed.knots["铁匠铺"].pc).toBe(2);
    expect(parsed.lines[0]).toEqual({ type: "knot", name: "开场" });
    expect(parsed.knots["铁匠铺"].actors).toEqual(["布洛克"]);
  });

  it("choice 组：连续 * 构成一组，bodyStart / bodyEnd / gatherPc 正确", () => {
    const parsed = parseScript(
      [
        "* 查看炉火",
        "> 炉火正旺",
        "~ gold += 1",
        "* 和布洛克交谈",
        "-> 对话",
        "* 离开",
        "-> 城门口",
        "- 你最终离开了铁匠铺。",
      ].join("\n"),
    );

    const group = parsed.choiceGroups[0];
    expect(group).toBeDefined();
    expect(group.choices).toEqual([
      { label: "查看炉火", bodyStart: 1, bodyEnd: 2 },
      { label: "和布洛克交谈", bodyStart: 4, bodyEnd: 4 },
      { label: "离开", bodyStart: 6, bodyEnd: 6 },
    ]);
    expect(group.gatherPc).toBe(7);
  });

  it("行内条件：解析为 inline 数组，text 保留原文", () => {
    // 独占一行
    const standalone = parseScript("{true: A|B}");
    expect(standalone.lines).toEqual([
      {
        type: "narration",
        text: "{true: A|B}",
        inline: [{ expr: "true", then: "A", else: "B" }],
      },
    ]);

    // 嵌在文本中
    const embedded = parseScript("> 看到{gold > 5: 金币|空空}了");
    expect(embedded.lines).toEqual([
      {
        type: "narration",
        text: "看到{gold > 5: 金币|空空}了",
        inline: [{ expr: "gold > 5", then: "金币", else: "空空" }],
      },
    ]);

    // 双引号内的 | 不是分隔符
    const quoted = parseScript('{t: "a|b"|c}');
    expect(quoted.lines[0]).toEqual({
      type: "narration",
      text: '{t: "a|b"|c}',
      inline: [{ expr: "t", then: '"a|b"', else: "c" }],
    });
  });

  it("子 knot：=== 铁匠铺.夜 正确索引", () => {
    const parsed = parseScript(
      ["=== 铁匠铺", "> 白天", "=== 铁匠铺.夜", "> 夜晚"].join("\n"),
    );

    expect(parsed.knots["铁匠铺"].pc).toBe(0);
    expect(parsed.knots["铁匠铺.夜"].pc).toBe(2);
    expect(parsed.lines[2]).toEqual({ type: "knot", name: "铁匠铺.夜" });
  });

  it("退化空字段往返：类型不丢失（修复「选什么类型都变旁白」）", () => {
    const cases: ScriptLine[] = [
      { type: "say", speaker: "", text: "" },
      { type: "action", text: "" },
      { type: "choice", label: "" },
      { type: "bg", image: "" },
      { type: "actor_ref", cardName: "" },
    ];
    const src = serializeScript({
      frontmatter: {},
      lines: cases,
      knots: {},
      vars: [],
      choiceGroups: {},
    });
    const got = parseScript(src).lines;
    expect(got.map((l) => l.type)).toEqual([
      "say",
      "action",
      "choice",
      "bg",
      "actor_ref",
    ]);
  });

  it("序列化退化形 `****：` 解析回 say 而非旁白", () => {
    const [got] = parseScript("****：").lines;
    expect(got.type).toBe("say");
    expect(got).toMatchObject({ type: "say", speaker: "", text: "" });
  });

  it("未识别语法标为草稿 narration，真实旁白不标 draft", () => {
    // 半截语法（无闭合 `**`、无 `>` 前缀）→ 回退为 narration 且 draft
    const halfway = parseScript("**布洛").lines;
    expect(halfway[0]).toMatchObject({
      type: "narration",
      text: "**布洛",
      draft: true,
    });

    // 明确写的旁白 `> 文本` 不是草稿
    const real = parseScript("> 炉火噼啪").lines;
    expect(real[0]).toMatchObject({ type: "narration", text: "炉火噼啪" });
    expect((real[0] as { draft?: boolean }).draft).toBeUndefined();
  });
});
