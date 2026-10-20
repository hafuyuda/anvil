import { afterEach, describe, expect, it, vi } from "vitest";
import { rollDice, validateDiceExpression } from "./dice";

/** 按顺序喂固定随机数，让掷骰结果可预测 */
function withRandoms<T>(randoms: number[], fn: () => T): T {
  let i = 0;
  const spy = vi.spyOn(Math, "random").mockImplementation(() => randoms[i++]);
  try {
    return fn();
  } finally {
    spy.mockRestore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateDiceExpression", () => {
  it("规范化常见写法", () => {
    expect(validateDiceExpression("1d20")).toBe("1d20");
    expect(validateDiceExpression("2d6+3")).toBe("2d6+3");
    expect(validateDiceExpression(" 2 d 6 + 3 ")).toBe("2d6+3");
    expect(validateDiceExpression("1d20+1d4")).toBe("1d20+1d4");
    expect(validateDiceExpression("5")).toBe("5");
    expect(validateDiceExpression("1d8-2")).toBe("1d8-2");
  });

  it("支持百分比骰与取舍后缀", () => {
    expect(validateDiceExpression("d%")).toBe("d%");
    expect(validateDiceExpression("4d6dl1")).toBe("4d6dl1");
    expect(validateDiceExpression("2d20kh1")).toBe("2d20kh1");
    expect(validateDiceExpression("2d20kl1")).toBe("2d20kl1");
    expect(validateDiceExpression("4d6dh1")).toBe("4d6dh1");
  });

  it("拒绝非法表达式", () => {
    expect(validateDiceExpression("")).toBeNull();
    expect(validateDiceExpression("abc")).toBeNull();
    expect(validateDiceExpression("2d")).toBeNull();
    expect(validateDiceExpression("d")).toBeNull();
    // 取舍数量不能超过骰子个数
    expect(validateDiceExpression("1d20dl5")).toBeNull();
    expect(validateDiceExpression("2d6kh0")).toBeNull();
    // 面数下界
    expect(validateDiceExpression("1d1")).toBeNull();
    // 残缺的加减号
    expect(validateDiceExpression("1d20+")).toBeNull();
  });
});

describe("rollDice", () => {
  it("单骰返回裸值与自然值", () => {
    const r = withRandoms([0.5], () => rollDice("1d20"));
    expect(r).not.toBeNull();
    expect(r!.result).toBe(11);
    expect(r!.detail).toEqual([11]);
    expect(r!.natural).toBe(11);
    expect(r!.dropped).toEqual([]);
    expect(r!.isRoll).toBe(true);
  });

  it("带修正的骰组", () => {
    const r = withRandoms([0.5], () => rollDice("1d20+5"));
    expect(r!.result).toBe(16);
    expect(r!.natural).toBe(11);
    expect(r!.detail).toEqual([11]);
  });

  it("多段骰相加", () => {
    const r = withRandoms([0.5, 0.0], () => rollDice("1d20+1d4"));
    expect(r!.result).toBe(12);
    expect(r!.detail).toEqual([11, 1]);
    expect(r!.natural).toBe(11);
  });

  it("kh 保留最高", () => {
    const r = withRandoms([0.95, 0.0], () => rollDice("2d20kh1"));
    expect(r!.result).toBe(20);
    expect(r!.detail).toEqual([20]);
    expect(r!.dropped).toEqual([1]);
    expect(r!.natural).toBe(20);
  });

  it("kl 保留最低", () => {
    const r = withRandoms([0.95, 0.0], () => rollDice("2d20kl1"));
    expect(r!.result).toBe(1);
    expect(r!.detail).toEqual([1]);
    expect(r!.dropped).toEqual([20]);
  });

  it("dl 丢弃最低", () => {
    // 骰出 3, 1, 6, 2
    const r = withRandoms([0.4, 0.0, 0.9, 0.2], () => rollDice("4d6dl1"));
    expect(r!.result).toBe(11);
    expect(r!.detail).toEqual([2, 3, 6]);
    expect(r!.dropped).toEqual([1]);
  });

  it("dh 丢弃最高", () => {
    // 骰出 3, 1, 6, 2
    const r = withRandoms([0.4, 0.0, 0.9, 0.2], () => rollDice("4d6dh1"));
    expect(r!.result).toBe(6);
    expect(r!.dropped).toEqual([6]);
  });

  it("d% 等价于百面骰", () => {
    const r = withRandoms([0.5], () => rollDice("d%"));
    expect(r!.result).toBe(51);
    expect(r!.expr).toBe("d%");
  });

  it("纯数字不掷骰", () => {
    const r = rollDice("7");
    expect(r!.result).toBe(7);
    expect(r!.detail).toEqual([]);
    expect(r!.natural).toBeNull();
    expect(r!.isRoll).toBe(false);
  });

  it("减法修正", () => {
    const r = withRandoms([0.95], () => rollDice("1d8-2"));
    expect(r!.result).toBe(6);
  });

  it("非法表达式返回 null", () => {
    expect(rollDice("不是骰子")).toBeNull();
  });
});
