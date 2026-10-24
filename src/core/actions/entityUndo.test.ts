import { describe, expect, it } from "vitest";
import type { PileData, Token } from "../ipc";
import {
  insertCardIntoPileList,
  restorePileData,
  restorePileTokens,
  restoreTokensForCard,
  tokensTouchCard,
} from "./entityUndo";

const tok = (id: string, over: Partial<Token> = {}): Token => ({
  id,
  card_id: null,
  name_override: null,
  value_overrides: {},
  x: 0,
  y: 0,
  rotation: 0,
  layer: 0,
  visible: true,
  face_down: false,
  pile: null,
  ...over,
});

const pile = (over: Partial<PileData> = {}): PileData => ({
  group_id: "g1",
  label: "牌堆",
  remaining: ["c1", "c2", "c3"],
  initial: ["c1", "c2", "c3"],
  total: 3,
  ...over,
});

describe("tokensTouchCard", () => {
  it("命中直接引用", () => {
    expect(tokensTouchCard([tok("t1", { card_id: "c1" })], "c1")).toBe(true);
    expect(tokensTouchCard([tok("t1", { card_id: "c2" })], "c1")).toBe(false);
  });

  it("命中卡盒内的牌", () => {
    expect(tokensTouchCard([tok("t1", { pile: pile() })], "c2")).toBe(true);
    expect(tokensTouchCard([tok("t1", { pile: pile() })], "c9")).toBe(false);
  });

  it("纯装饰 token 不命中", () => {
    expect(tokensTouchCard([tok("t1")], "c1")).toBe(false);
  });
});

describe("insertCardIntoPileList", () => {
  it("插回原位置", () => {
    expect(insertCardIntoPileList(["c1", "c3"], ["c1", "c2", "c3"], "c2")).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
  });

  it("已在列表里则不重复插", () => {
    expect(insertCardIntoPileList(["c1", "c2"], ["c1", "c2"], "c2")).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("before 里就没有（当时已抽走）的不插", () => {
    expect(insertCardIntoPileList(["c1", "c3"], ["c1", "c3"], "c2")).toEqual([
      "c1",
      "c3",
    ]);
  });
});

describe("restorePileData", () => {
  it("remaining 与 initial 各自插回原位置，total 跟着 initial", () => {
    // c1 当时已被抽走，所以 before.remaining 里没有它；删卡又摘掉了 c2
    const before = pile({ remaining: ["c2", "c3"], initial: ["c1", "c2", "c3"] });
    const current = pile({ remaining: ["c3"], initial: ["c1", "c3"] });
    const out = restorePileData(current, before, "c2");
    expect(out.remaining).toEqual(["c2", "c3"]);
    expect(out.initial).toEqual(["c1", "c2", "c3"]);
    expect(out.total).toBe(3);
  });

  it("没动过就原样返回同一个对象", () => {
    const p = pile();
    expect(restorePileData(p, p, "c1")).toBe(p);
  });
});

describe("restoreTokensForCard", () => {
  it("Remove 模式：被整枚删掉的按原索引插回", () => {
    const before = [tok("t1"), tok("t2", { card_id: "c1" }), tok("t3")];
    const current = [tok("t1"), tok("t3")];
    const out = restoreTokensForCard(before, current, "c1");
    expect(out.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(out[1].card_id).toBe("c1");
  });

  it("Remove 模式：只插回碰过这张卡的，不复活用户另外删的", () => {
    const before = [tok("t1"), tok("t2", { card_id: "c1" }), tok("t3")];
    const current = [tok("t1")]; // 用户随后又删了 t3
    const out = restoreTokensForCard(before, current, "c1");
    expect(out.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("Detach 模式：恢复 card_id，名字仍是墓碑才恢复名字", () => {
    const before = [
      tok("t1", { card_id: "c1", name_override: "哥布林" }),
    ];
    const detached = tok("t1", {
      card_id: null,
      name_override: "哥布林（已删除）",
      x: 42,
    });
    const out = restoreTokensForCard(before, [detached], "c1");
    expect(out[0].card_id).toBe("c1");
    expect(out[0].name_override).toBe("哥布林");
    expect(out[0].x).toBe(42); // 用户之后挪过的位置保留
  });

  it("Detach 模式：用户改过名字就不覆盖", () => {
    const before = [tok("t1", { card_id: "c1", name_override: "哥布林" })];
    const detached = tok("t1", {
      card_id: null,
      name_override: "空箱子",
      x: 42,
    });
    const out = restoreTokensForCard(before, [detached], "c1");
    expect(out[0].card_id).toBe("c1");
    expect(out[0].name_override).toBe("空箱子");
  });

  it("卡盒：把牌插回 remaining / initial 的原位置", () => {
    const before = [tok("p1", { pile: pile({ remaining: ["c1", "c2"] }) })];
    const current = [
      tok("p1", { pile: pile({ remaining: ["c1", "c3"], initial: ["c1", "c3"] }) }),
    ];
    const out = restoreTokensForCard(before, current, "c2");
    expect(out[0].pile?.remaining).toEqual(["c1", "c2", "c3"]);
    expect(out[0].pile?.initial).toEqual(["c1", "c2", "c3"]);
    expect(out[0].pile?.total).toBe(3);
  });

  it("卡盒里当时已抽走的牌不插回 remaining", () => {
    const before = [tok("p1", { pile: pile({ remaining: ["c1"], initial: ["c1", "c2"] }) })];
    const current = [tok("p1", { pile: pile({ remaining: ["c1"], initial: ["c1"] }) })];
    const out = restoreTokensForCard(before, current, "c2");
    expect(out[0].pile?.remaining).toEqual(["c1"]);
    expect(out[0].pile?.initial).toEqual(["c1", "c2"]);
  });
});

describe("restorePileTokens", () => {
  it("被摘掉的卡盒按原索引插回，别的 token 不动", () => {
    const before = [
      tok("t1"),
      tok("pile1", { pile: pile({ group_id: "g1" }) }),
      tok("t2"),
      tok("pile2", { pile: pile({ group_id: "g2" }) }),
    ];
    const current = [tok("t1"), tok("t2"), tok("pile2", { pile: pile({ group_id: "g2" }) })];
    const out = restorePileTokens(before, current, "g1");
    expect(out.map((t) => t.id)).toEqual(["t1", "pile1", "t2", "pile2"]);
  });

  it("不复活用户另外删掉的 token", () => {
    const before = [
      tok("t1"),
      tok("pile1", { pile: pile({ group_id: "g1" }) }),
      tok("t2"),
    ];
    const current = [tok("t1")];
    const out = restorePileTokens(before, current, "g1");
    expect(out.map((t) => t.id)).toEqual(["t1", "pile1"]);
  });
});
