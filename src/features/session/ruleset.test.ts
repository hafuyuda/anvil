import { describe, expect, it } from "vitest";
import { getRuleSet, judge } from "./ruleset";

describe("coc7 判定", () => {
  const roll = (natural: number, target: number | null) =>
    judge({ ruleSet: "coc7", natural, result: natural, target });

  it("自然 1 是大成功", () => {
    expect(roll(1, 60)?.level).toBe("critical");
  });

  it("自然 100 是大失败", () => {
    expect(roll(100, 60)?.level).toBe("fumble");
  });

  it("分档：极限 / 困难 / 普通", () => {
    expect(roll(12, 60)?.level).toBe("extreme");
    expect(roll(30, 60)?.level).toBe("hard");
    expect(roll(59, 60)?.level).toBe("success");
    expect(roll(60, 60)?.level).toBe("success");
  });

  it("技能值 50 以上时 96-99 只是普通失败", () => {
    expect(roll(97, 60)?.level).toBe("failure");
  });

  it("技能值不足 50 时 96-99 升级为大失败", () => {
    expect(roll(97, 40)?.level).toBe("fumble");
  });

  it("技能值极高时 96-99 仍是成功，不误判大失败", () => {
    expect(roll(97, 99)?.level).toBe("success");
  });

  it("普通失败", () => {
    expect(roll(70, 60)?.level).toBe("failure");
  });

  it("没有技能值时不判定", () => {
    expect(roll(42, null)).toBeNull();
  });
});

describe("dnd5e 判定", () => {
  const roll = (natural: number, result: number, dc: number | null) =>
    judge({ ruleSet: "dnd5e", natural, result, target: dc });

  it("裸骰 20 忽略 DC 直接大成功", () => {
    expect(roll(20, 25, 30)?.level).toBe("critical");
  });

  it("裸骰 1 直接大失败", () => {
    expect(roll(1, 5, 5)?.level).toBe("fumble");
  });

  it("对 DC 比较最终值", () => {
    expect(roll(15, 17, 15)?.level).toBe("success");
    expect(roll(15, 14, 15)?.level).toBe("failure");
  });

  it("没有 DC 时不判定", () => {
    expect(roll(15, 15, null)).toBeNull();
  });
});

describe("generic 判定", () => {
  it("达到难度即成功", () => {
    expect(judge({ ruleSet: "generic", natural: 12, result: 12, target: 12 })?.level).toBe(
      "success",
    );
    expect(judge({ ruleSet: "generic", natural: 11, result: 11, target: 12 })?.level).toBe(
      "failure",
    );
  });

  it("泛用规则不做自然 20 特判", () => {
    expect(judge({ ruleSet: "generic", natural: 20, result: 20, target: 25 })?.level).toBe(
      "failure",
    );
  });
});

describe("getRuleSet", () => {
  it("未知 id 回落到泛用", () => {
    expect(getRuleSet("nonsense").id).toBe("generic");
    expect(getRuleSet(null).id).toBe("generic");
    expect(getRuleSet(undefined).id).toBe("generic");
  });

  it("认得内置规则集", () => {
    expect(getRuleSet("coc7").name).toBe("克苏鲁的呼唤 7 版");
    expect(getRuleSet("dnd5e").name).toBe("龙与地下城 5 版");
  });
});
