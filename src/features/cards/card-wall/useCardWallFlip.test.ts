import { describe, expect, it } from "vitest";
import { flipDelta, hasMoved, type Rect } from "./useCardWallFlip";

const r = (left: number, top: number): Rect => ({ left, top });

describe("flipDelta", () => {
  it("算出把元素挪回旧位置的位移", () => {
    // 旧在 (100, 50)，新在 (140, 50)：要往左挪 40 才回到旧位置
    expect(flipDelta(r(100, 50), r(140, 50))).toEqual({ dx: -40, dy: 0 });
    expect(flipDelta(r(100, 50), r(100, 210))).toEqual({ dx: 0, dy: -160 });
  });

  it("没动就是 0", () => {
    expect(flipDelta(r(100, 50), r(100, 50))).toEqual({ dx: 0, dy: 0 });
  });
});

describe("hasMoved", () => {
  it("超过半个像素才算动", () => {
    expect(hasMoved({ dx: 0, dy: 0 })).toBe(false);
    expect(hasMoved({ dx: 0.4, dy: 0 })).toBe(false);
    expect(hasMoved({ dx: -0.6, dy: 0 })).toBe(true);
    expect(hasMoved({ dx: 0, dy: 30 })).toBe(true);
  });

  it("两个轴各自判断", () => {
    expect(hasMoved({ dx: 12, dy: 0 })).toBe(true);
    expect(hasMoved({ dx: 0, dy: -8 })).toBe(true);
  });
});
