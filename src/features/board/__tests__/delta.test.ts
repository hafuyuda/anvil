import { describe, expect, it } from "vitest";
import type { PileData, Token } from "../../../core/ipc";
import {
  deletePayload,
  flipPayload,
  layerPayload,
  movePayload,
  pilePayload,
  placePayload,
  pileStateOf,
  snapshotOf,
} from "../delta";

function tok(id: string, over: Partial<Token> = {}): Token {
  return {
    id,
    card_id: null,
    name_override: null,
    value_overrides: {},
    x: 0,
    y: 0,
    w: 140,
    h: 205,
    rotation: 0,
    layer: 0,
    visible: true,
    face_down: false,
    pile: null,
    ...over,
  };
}

function pile(over: Partial<PileData> = {}): PileData {
  return {
    group_id: "g",
    label: "牌堆",
    remaining: ["c1", "c2"],
    initial: ["c1", "c2"],
    total: 2,
    ...over,
  };
}

describe("snapshotOf", () => {
  it("带上回放需要的全部字段", () => {
    const s = snapshotOf(tok("a", { x: 1, y: 2, layer: 5, face_down: true }));
    expect(s).toMatchObject({ id: "a", x: 1, y: 2, layer: 5, face_down: true });
  });

  it("丢掉 value_overrides（死字段，不该进牌谱）", () => {
    expect(snapshotOf(tok("a"))).not.toHaveProperty("value_overrides");
  });

  it("卡盒 token 保留 pile", () => {
    expect(snapshotOf(tok("p", { pile: pile() })).pile?.remaining).toEqual(["c1", "c2"]);
  });
});

describe("movePayload", () => {
  it("只记真正动了的 token", () => {
    const p = movePayload({
      before: [tok("a", { x: 0, y: 0 }), tok("b", { x: 10, y: 10 })],
      after: [tok("a", { x: 5, y: 5 }), tok("b", { x: 10, y: 10 })],
      summary: "移动",
    });
    expect(p.token_ids).toEqual(["a"]);
    expect(p.from).toEqual([{ id: "a", x: 0, y: 0 }]);
    expect(p.to).toEqual([{ id: "a", x: 5, y: 5 }]);
  });

  it("一枚都没动时不产生空 delta（回放引擎会判为不可回放）", () => {
    const p = movePayload({
      before: [tok("a")],
      after: [tok("a")],
      summary: "移动",
    });
    expect(p.to).toEqual([]);
  });
});

describe("flipPayload", () => {
  it("带上翻面后的目标状态", () => {
    expect(
      flipPayload({ tokenIds: ["a"], faceDown: true, summary: "翻扣" }),
    ).toMatchObject({ token_ids: ["a"], face_down: true, count: 1 });
  });
});

describe("layerPayload", () => {
  it("逐个记调整后的 layer", () => {
    const p = layerPayload({
      tokens: [tok("a", { layer: 9 }), tok("b", { layer: 8 })],
      where: "front",
      summary: "置顶",
    });
    expect(p.layers).toEqual([
      { id: "a", layer: 9 },
      { id: "b", layer: 8 },
    ]);
  });
});

describe("deletePayload", () => {
  it("带上被删 token 的快照，供倒退还原与完整性校验", () => {
    const p = deletePayload({ removed: [tok("a", { x: 1, y: 2 })], summary: "删除" });
    expect(p.token_ids).toEqual(["a"]);
    expect(p.tokens[0]).toMatchObject({ id: "a", x: 1, y: 2 });
  });
});

describe("pilePayload", () => {
  it("抽牌带落位 token 与卡盒剩余", () => {
    const p = pilePayload({
      action: "draw",
      pileTokenId: "p",
      count: 1,
      placed: [tok("t1", { x: 100, y: 200 })],
      pileAfter: pile({ remaining: ["c2"] }),
      summary: "抽 1 张",
    });
    expect(p.placed![0]).toMatchObject({ id: "t1", x: 100, y: 200 });
    expect(p.pile_after!.remaining).toEqual(["c2"]);
  });

  it("洗牌只带卡盒剩余，不带 placed", () => {
    const p = pilePayload({
      action: "shuffle",
      pileTokenId: "p",
      pileAfter: pile({ remaining: ["c2", "c1"] }),
      summary: "洗牌",
    });
    expect(p.placed).toBeUndefined();
    expect(p.pile_after!.remaining).toEqual(["c2", "c1"]);
  });
});

describe("pileStateOf", () => {
  it("拷贝而不是引用（回放要留得住每一步）", () => {
    const src = pile();
    const s = pileStateOf(src)!;
    src.remaining.push("c3");
    expect(s.remaining).toEqual(["c1", "c2"]);
  });

  it("没有卡盒时返回 null", () => {
    expect(pileStateOf(null)).toBeNull();
  });
});

describe("placePayload", () => {
  it("带上 token 快照与来源", () => {
    const p = placePayload({
      tokens: [tok("a", { x: 3, y: 4, card_id: "c1" })],
      source: "cards",
      cardIds: ["c1"],
      summary: "落子",
    });
    expect(p.token_ids).toEqual(["a"]);
    expect(p.tokens[0]).toMatchObject({ x: 3, y: 4, card_id: "c1" });
    expect(p.source).toBe("cards");
  });
});
