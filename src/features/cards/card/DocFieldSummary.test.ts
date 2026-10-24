import { describe, expect, it } from "vitest";
import type { FieldDef, FieldType } from "../../../core/ipc";
import { formatFieldValue } from "./DocFieldSummary";

function field(ty: FieldType): FieldDef {
  return {
    key: "k",
    label: "字段",
    ty,
    required: false,
    order: 0,
    deprecated: false,
  };
}

const NO_CARDS = new Map<string, string>();

describe("formatFieldValue", () => {
  it("空值一律返回 null（速览不占位）", () => {
    expect(formatFieldValue(field({ kind: "text" }), null, NO_CARDS)).toBeNull();
    expect(formatFieldValue(field({ kind: "text" }), "", NO_CARDS)).toBeNull();
    expect(
      formatFieldValue(field({ kind: "tags" }), [], NO_CARDS),
    ).toBeNull();
    expect(
      formatFieldValue(field({ kind: "number" }), null, NO_CARDS),
    ).toBeNull();
  });

  it("布尔 false 是有效值，不是空", () => {
    expect(
      formatFieldValue(field({ kind: "bool" }), false, NO_CARDS),
    ).toBe("否");
    expect(
      formatFieldValue(field({ kind: "bool" }), true, NO_CARDS),
    ).toBe("是");
  });

  it("数字 0 是有效值", () => {
    expect(
      formatFieldValue(field({ kind: "number" }), 0, NO_CARDS),
    ).toBe("0");
  });

  it("长文本压成一行并截断", () => {
    const long = "甲".repeat(100);
    const out = formatFieldValue(
      field({ kind: "rich_text" }),
      `第一行\n第二行  ${long}`,
      NO_CARDS,
    );
    expect(out).not.toBeNull();
    expect(out).not.toContain("\n");
    expect(out?.length).toBe(61); // 60 字符 + 省略号
    expect(out?.endsWith("…")).toBe(true);
  });

  it("多选与标签用顿号连接", () => {
    expect(
      formatFieldValue(
        field({ kind: "multi_enum", options: [] }),
        ["火", "冰"],
        NO_CARDS,
      ),
    ).toBe("火、冰");
    expect(
      formatFieldValue(field({ kind: "tags" }), ["a", "b"], NO_CARDS),
    ).toBe("a、b");
  });

  it("引用解析为卡名，失效时明确标注而不是丢 uuid", () => {
    const cards = new Map([["c1", "艾莉"]]);
    expect(
      formatFieldValue(field({ kind: "ref", target_types: [] }), "c1", cards),
    ).toBe("艾莉");
    expect(
      formatFieldValue(field({ kind: "ref", target_types: [] }), "gone", cards),
    ).toBe("（引用已失效）");
  });

  it("图片取文件名，不带目录", () => {
    expect(
      formatFieldValue(field({ kind: "image" }), "C:\\img\\hero.png", NO_CARDS),
    ).toBe("hero.png");
    expect(
      formatFieldValue(field({ kind: "image" }), "/img/hero.png", NO_CARDS),
    ).toBe("hero.png");
  });

  it("json 序列化展示", () => {
    expect(
      formatFieldValue(field({ kind: "json" }), { a: 1 }, NO_CARDS),
    ).toBe('{"a":1}');
  });

  it("类型不匹配时返回 null（防御，不崩）", () => {
    expect(
      formatFieldValue(field({ kind: "number" }), "不是数字", NO_CARDS),
    ).toBeNull();
    expect(
      formatFieldValue(field({ kind: "text" }), 42, NO_CARDS),
    ).toBeNull();
  });
});
