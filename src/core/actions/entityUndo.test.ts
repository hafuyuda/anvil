import { describe, expect, it } from "vitest";
import type {
  InitiativeEntry,
  InitiativeTracker,
  PileData,
  Token,
} from "../ipc";
import {
  insertCardIntoPileList,
  restoreEntriesForCard,
  restorePileData,
  restorePileTokens,
  restoreTokensForCard,
  restoreTrackerForCard,
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

describe("restoreEntriesForCard", () => {
  const entry = (name: string, cardId: string | null, value: number): InitiativeEntry => ({
    token_id: null,
    card_id: cardId,
    name,
    value,
  });

  it("被移走的先攻条目按原索引插回", () => {
    const before = [
      entry("斥候", "c1", 20),
      entry("哥布林", "c2", 15),
      entry("法师", "c3", 12),
    ];
    const current = [entry("斥候", "c1", 20), entry("法师", "c3", 12)];
    const out = restoreEntriesForCard(before, current, "c2");
    expect(out.map((e) => e.name)).toEqual(["斥候", "哥布林", "法师"]);
  });

  it("没有对应条目时原样返回", () => {
    const current = [entry("斥候", "c1", 20)];
    expect(restoreEntriesForCard(current, current, "c9")).toBe(current);
  });
});

describe("restoreTrackerForCard", () => {
  const entry = (name: string, cardId: string | null): InitiativeEntry => ({
    token_id: null,
    card_id: cardId,
    name,
    value: 10,
  });

  it("没被这次删除碰过就原样返回", () => {
    const before: InitiativeTracker = {
      round: 1,
      turn_index: 0,
      active: true,
      entries: [entry("a", "c9")],
    };
    expect(restoreTrackerForCard(before, before, "c1")).toBe(before);
  });

  it("插回条目时还原被夹紧的下标，并还原被清空的 active", () => {
    const before: InitiativeTracker = {
      round: 3,
      turn_index: 2,
      active: true,
      entries: [entry("a", "c1"), entry("b", "c2"), entry("c", "c3")],
    };
    // 后端移走 b 后把下标从 2 夹到 1
    const after: InitiativeTracker = {
      round: 3,
      turn_index: 1,
      active: true,
      entries: [entry("a", "c1"), entry("c", "c3")],
    };
    const out = restoreTrackerForCard(before, after, "c2");
    expect(out?.entries.map((e) => e.name)).toEqual(["a", "b", "c"]);
    expect(out?.turn_index).toBe(2);
    expect(out?.active).toBe(true);
  });

  it("用户之后推进过轮次就保留他的下标", () => {
    const before: InitiativeTracker = {
      round: 3,
      turn_index: 2,
      active: true,
      entries: [entry("a", "c1"), entry("b", "c2"), entry("c", "c3")],
    };
    // 用户删卡之后又点了一次「下一回合」，下标和轮次都变了
    const advanced: InitiativeTracker = {
      round: 4,
      turn_index: 0,
      active: true,
      entries: [entry("a", "c1"), entry("c", "c3")],
    };
    const out = restoreTrackerForCard(before, advanced, "c2");
    expect(out?.entries.map((e) => e.name)).toEqual(["a", "b", "c"]);
    expect(out?.turn_index).toBe(0);
  });

  it("删除前根本没有 tracker 就保持没有", () => {
    expect(restoreTrackerForCard(null, null, "c1")).toBeNull();
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
