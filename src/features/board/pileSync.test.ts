import { describe, expect, it } from "vitest";
import type { PileData } from "../../core/ipc";
import { syncPileWithGroup } from "./pileSync";

function pile(over: Partial<PileData> = {}): PileData {
  return {
    group_id: "g1",
    label: "卡盒",
    initial: ["a", "b"],
    remaining: ["a", "b"],
    total: 2,
    ...over,
  };
}

describe("syncPileWithGroup", () => {
  it("组里新增的卡按组顺序补进 initial 与 remaining", () => {
    const { pile: next, added } = syncPileWithGroup(pile(), ["a", "b", "c", "d"]);
    expect(added).toEqual(["c", "d"]);
    expect(next.initial).toEqual(["a", "b", "c", "d"]);
    expect(next.remaining).toEqual(["a", "b", "c", "d"]);
    expect(next.total).toBe(4);
  });

  it("只补不删：组里移除的卡不动卡盒", () => {
    const { pile: next, added } = syncPileWithGroup(pile(), ["a"]);
    expect(added).toEqual([]);
    expect(next.initial).toEqual(["a", "b"]);
    expect(next.remaining).toEqual(["a", "b"]);
  });

  it("无新增时原样返回（同一引用，调用方可跳过写盘）", () => {
    const p = pile();
    const { pile: next, added } = syncPileWithGroup(p, ["a", "b"]);
    expect(added).toEqual([]);
    expect(next).toBe(p);
  });

  it("多重集：组里两份、卡盒一份，补一份", () => {
    const { pile: next, added } = syncPileWithGroup(pile(), ["a", "a", "b"]);
    expect(added).toEqual(["a"]);
    expect(next.initial).toEqual(["a", "b", "a"]);
    expect(next.total).toBe(3);
  });

  it("抽过的牌：补的进 remaining 尾部，不复活已抽走的", () => {
    const { pile: next, added } = syncPileWithGroup(
      pile({ remaining: ["b"] }), // a 已抽走
      ["a", "b", "c"],
    );
    expect(added).toEqual(["c"]);
    expect(next.initial).toEqual(["a", "b", "c"]);
    expect(next.remaining).toEqual(["b", "c"]);
  });

  it("空组不误伤：added 为空", () => {
    const { added } = syncPileWithGroup(pile(), []);
    expect(added).toEqual([]);
  });

  it("不修改传入的 pile（纯函数）", () => {
    const p = pile();
    syncPileWithGroup(p, ["a", "b", "c"]);
    expect(p.initial).toEqual(["a", "b"]);
    expect(p.remaining).toEqual(["a", "b"]);
    expect(p.total).toBe(2);
  });
});
