import { describe, expect, it } from "vitest";
import { countUpValue, easeOutCubic } from "./useCountUp";

describe("easeOutCubic", () => {
  it("端点固定", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("单调递增", () => {
    let prev = -1;
    for (let i = 0; i <= 20; i++) {
      const v = easeOutCubic(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("前半段走得比线性快", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe("countUpValue", () => {
  it("起止值正确", () => {
    expect(countUpValue(10, 20, 0)).toBe(10);
    expect(countUpValue(10, 20, 1)).toBe(20);
  });

  it("往少了扣也成立", () => {
    expect(countUpValue(20, 10, 0)).toBe(20);
    expect(countUpValue(20, 10, 1)).toBe(10);
    const mid = countUpValue(20, 10, 0.5);
    expect(mid).toBeLessThan(20);
    expect(mid).toBeGreaterThan(10);
  });

  it("t 越界时夹住，不会冲过目标", () => {
    expect(countUpValue(0, 100, 2)).toBe(100);
    expect(countUpValue(0, 100, -1)).toBe(0);
  });

  it("中途值确实在两端之间", () => {
    for (let i = 1; i < 10; i++) {
      const v = countUpValue(5, 45, i / 10);
      expect(v).toBeGreaterThan(5);
      expect(v).toBeLessThan(45);
    }
  });

  it("from === to 时任何 t 都返回同一个值", () => {
    expect(countUpValue(7, 7, 0.3)).toBe(7);
  });
});
