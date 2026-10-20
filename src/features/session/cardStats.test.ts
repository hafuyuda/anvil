import { describe, expect, it } from "vitest";
import type { Card, CardType } from "../../core/ipc";
import { hpRatio, listNumberStats, readHp } from "./cardStats";

function card(values: Record<string, unknown>): Card {
  return {
    id: "c1",
    type_id: "t1",
    name: "索林",
    values,
    created_at: 0,
    updated_at: 0,
  };
}

const numberType = (fields: CardType["fields"]): CardType => ({
  id: "t1",
  name: "角色",
  color: "#fff",
  fields,
  allowed_relation_kinds: [],
  views: [],
  created_at: 0,
  updated_at: 0,
});

function numberField(key: string, label: string) {
  return {
    key,
    label,
    ty: { kind: "number" as const },
    required: false,
    order: 0,
    deprecated: false,
  };
}

describe("readHp", () => {
  it("认得约定键名的各种写法", () => {
    expect(readHp(card({ hp: 12, max_hp: 20 }))).toMatchObject({
      hp: 12,
      max: 20,
    });
    expect(readHp(card({ HP: 12, MaxHP: 20 }))).toMatchObject({
      hp: 12,
      max: 20,
    });
    expect(readHp(card({ 生命值: 12, 最大生命值: 20 }))).toMatchObject({
      hp: 12,
      max: 20,
    });
  });

  it("回带实际字段名，供写回用", () => {
    expect(readHp(card({ 生命值: 12, 最大生命值: 20 }))).toMatchObject({
      hpKey: "生命值",
      maxKey: "最大生命值",
    });
  });

  it("键名不匹配时不猜", () => {
    const s = readHp(card({ health: 12 }));
    expect(s.hp).toBeNull();
    expect(s.max).toBeNull();
    expect(s.hpKey).toBeNull();
  });

  it("字符串数值也能读", () => {
    expect(readHp(card({ hp: "12", max_hp: "20" }))).toMatchObject({
      hp: 12,
      max: 20,
    });
  });

  it("非数值返回 null 而不是 NaN", () => {
    expect(readHp(card({ hp: "很多" })).hp).toBeNull();
  });
});

describe("listNumberStats", () => {
  it("只取卡类型里声明为 number 的字段", () => {
    const type = numberType([
      numberField("str", "力量"),
      numberField("dex", "敏捷"),
      { ...numberField("notes", "备注"), ty: { kind: "text" } },
    ]);
    const stats = listNumberStats(card({ str: 16, dex: 12, notes: "矮人" }), type);
    expect(stats.map((s) => s.key)).toEqual(["str", "dex"]);
    expect(stats[0]).toEqual({ key: "str", label: "力量", value: 16 });
  });

  it("跳过空值与非数值", () => {
    const type = numberType([
      numberField("str", "力量"),
      numberField("san", "理智"),
      numberField("edu", "教育"),
    ]);
    const stats = listNumberStats(
      card({ str: 16, san: "", edu: "大学" }),
      type,
    );
    expect(stats.map((s) => s.key)).toEqual(["str"]);
  });

  it("没有卡类型时不猜测", () => {
    expect(listNumberStats(card({ str: 16 }), null)).toEqual([]);
  });

  it("字段无标签时回落到键名", () => {
    const type = numberType([numberField("str", "")]);
    expect(listNumberStats(card({ str: 16 }), type)[0].label).toBe("str");
  });
});

describe("hpRatio", () => {
  it("算出百分比并夹在 0..1", () => {
    expect(hpRatio(10, 20)).toBe(0.5);
    expect(hpRatio(25, 20)).toBe(1);
    expect(hpRatio(-5, 20)).toBe(0);
  });

  it("缺任一项就没有血条", () => {
    expect(hpRatio(10, null)).toBeNull();
    expect(hpRatio(null, 20)).toBeNull();
  });

  it("上限为 0 时不除零", () => {
    expect(hpRatio(10, 0)).toBeNull();
  });
});
