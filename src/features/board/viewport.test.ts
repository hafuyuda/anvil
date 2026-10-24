import { describe, expect, it } from "vitest";
import type { Token } from "../../core/ipc";
import {
  tokenInView,
  visibleBoardRect,
  VIEWPORT_BUFFER_PX,
} from "./viewport";

const PAD = 16;

function token(over: Partial<Token>): Token {
  return {
    id: "t1",
    value_overrides: {},
    x: 0,
    y: 0,
    rotation: 0,
    layer: 0,
    visible: true,
    ...over,
  };
}

describe("visibleBoardRect", () => {
  it("零滚动时可见区从棋盘原点之前开始（减去 padding 与缓冲）", () => {
    const r = visibleBoardRect(
      { scrollLeft: 0, scrollTop: 0, clientWidth: 800, clientHeight: 600 },
      1,
      PAD,
    );
    const buf = VIEWPORT_BUFFER_PX;
    expect(r.x0).toBe(-PAD - buf);
    expect(r.y0).toBe(-PAD - buf);
    expect(r.x1).toBe(800 - PAD + buf);
    expect(r.y1).toBe(600 - PAD + buf);
  });

  it("滚动后可见区随之平移", () => {
    const r = visibleBoardRect(
      { scrollLeft: 1000, scrollTop: 500, clientWidth: 800, clientHeight: 600 },
      1,
      PAD,
    );
    expect(r.x0).toBe(1000 - PAD - VIEWPORT_BUFFER_PX);
    expect(r.x1).toBe(1000 + 800 - PAD + VIEWPORT_BUFFER_PX);
  });

  it("缩放只改变棋盘坐标跨度，缓冲换算后屏幕手感不变", () => {
    const m = { scrollLeft: 0, scrollTop: 0, clientWidth: 800, clientHeight: 600 };
    const z1 = visibleBoardRect(m, 1, PAD);
    const z2 = visibleBoardRect(m, 2, PAD);
    // zoom 2：内容只显示一半范围，缓冲也减半
    expect(z2.x1).toBeCloseTo((800 - PAD) / 2 + VIEWPORT_BUFFER_PX / 2);
    expect(z2.x1 - z2.x0).toBeCloseTo((z1.x1 - z1.x0) / 2);
  });

  it("zoom 为 0 或负按 1 处理（防御除零）", () => {
    const m = { scrollLeft: 0, scrollTop: 0, clientWidth: 800, clientHeight: 600 };
    expect(visibleBoardRect(m, 0, PAD)).toEqual(visibleBoardRect(m, 1, PAD));
    expect(visibleBoardRect(m, -1, PAD)).toEqual(visibleBoardRect(m, 1, PAD));
  });
});

describe("tokenInView", () => {
  const rect = { x0: 0, y0: 0, x1: 500, y1: 500 };

  it("完全在视口内", () => {
    expect(tokenInView(token({ x: 100, y: 100 }), rect)).toBe(true);
  });

  it("完全在视口外", () => {
    expect(tokenInView(token({ x: 900, y: 100 }), rect)).toBe(false);
    expect(tokenInView(token({ x: 100, y: 900 }), rect)).toBe(false);
  });

  it("部分相交也要渲染（边缘只露一个角）", () => {
    expect(tokenInView(token({ x: 450, y: 450 }), rect)).toBe(true);
    expect(tokenInView(token({ x: -100, y: -100 }), rect)).toBe(true);
  });

  it("擦边不算相交（右边缘恰好贴上）", () => {
    expect(tokenInView(token({ x: 500, y: 100 }), rect)).toBe(false);
    expect(tokenInView(token({ x: 100, y: 500 }), rect)).toBe(false);
  });

  it("未设置 w/h 时按默认尺寸", () => {
    // x=500 贴右边缘，默认宽 140 → 不相交；x=400 → 相交
    expect(tokenInView(token({ x: 500, y: 100 }), rect)).toBe(false);
    expect(tokenInView(token({ x: 400, y: 100 }), rect)).toBe(true);
  });

  it("自定义尺寸改变相交结果", () => {
    expect(
      tokenInView(token({ x: 500, y: 100, w: 10, h: 10 }), rect),
    ).toBe(false);
    expect(
      tokenInView(token({ x: 495, y: 100, w: 10, h: 10 }), rect),
    ).toBe(true);
  });
});
