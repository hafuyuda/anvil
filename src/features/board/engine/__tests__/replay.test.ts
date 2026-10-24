import { describe, expect, it } from "vitest";
import type { GameEvent } from "../../../../core/ipc";
import { applyEvent, deltaOf, isConsistent, replayAll, replayAt } from "../replay";
import type { TokenSnapshot } from "../types";

function ev(seq: number, kind: string, payload: unknown): GameEvent {
  return { seq, at: 1700000000000 + seq, kind, payload, note: null };
}

function snap(
  id: string,
  over: Partial<TokenSnapshot> = {},
): TokenSnapshot {
  return {
    id,
    card_id: null,
    name_override: null,
    x: 0,
    y: 0,
    w: null,
    h: null,
    rotation: 0,
    layer: 0,
    visible: true,
    face_down: false,
    pile: null,
    ...over,
  };
}

const place = (id: string, x: number, y: number) =>
  ev(1, "board.place", { token_ids: [id], tokens: [snap(id, { x, y })] });

describe("deltaOf", () => {
  it("老事件没有坐标时不可回放（0.4.0 之前落的牌谱）", () => {
    expect(deltaOf(ev(1, "board.move", { token_ids: ["a"], count: 1 }))).toBeNull();
    expect(deltaOf(ev(1, "board.place", { token_ids: ["a"], count: 1 }))).toBeNull();
  });

  it("payload 为 null / 非对象时不崩", () => {
    expect(deltaOf(ev(1, "board.place", null))).toBeNull();
    expect(deltaOf(ev(1, "board.place", "x"))).toBeNull();
  });

  it("快照缺 id 时整批判为不可用，而不是跳过那一枚", () => {
    const bad = ev(1, "board.place", {
      token_ids: ["a"],
      tokens: [{ x: 1, y: 2 }],
    });
    expect(deltaOf(bad)).toBeNull();
  });

  it("未知 kind 不可回放", () => {
    expect(deltaOf(ev(1, "chat.say", { x: 1 }))).toBeNull();
  });
});

describe("applyEvent", () => {
  it("place 落子后 token 出现且带坐标", () => {
    const r = applyEvent([], place("a", 30, 40));
    expect(r.ok).toBe(true);
    expect(r.tokens).toHaveLength(1);
    expect(r.tokens[0]).toMatchObject({ id: "a", x: 30, y: 40 });
  });

  it("move 只改坐标，不动其它字段", () => {
    const before = [snap("a", { x: 0, y: 0, face_down: true, layer: 3 })];
    const r = applyEvent(before, ev(2, "board.move", { to: [{ id: "a", x: 9, y: 8 }] }));
    expect(r.tokens[0]).toMatchObject({ x: 9, y: 8, face_down: true, layer: 3 });
  });

  it("move 命中多枚时逐枚生效", () => {
    const before = [snap("a"), snap("b")];
    const r = applyEvent(
      before,
      ev(2, "board.move", { to: [{ id: "a", x: 1, y: 1 }, { id: "b", x: 2, y: 2 }] }),
    );
    expect(r.tokens.map((t) => [t.id, t.x, t.y])).toEqual([
      ["a", 1, 1],
      ["b", 2, 2],
    ]);
  });

  it("flip 只翻指定 token", () => {
    const before = [snap("a"), snap("b")];
    const r = applyEvent(
      before,
      ev(2, "board.flip", { token_ids: ["a"], face_down: true }),
    );
    expect(r.tokens.find((t) => t.id === "a")!.face_down).toBe(true);
    expect(r.tokens.find((t) => t.id === "b")!.face_down).toBe(false);
  });

  it("layer 调整后按 layer 升序排好", () => {
    const before = [snap("a", { layer: 0 }), snap("b", { layer: 1 })];
    const r = applyEvent(
      before,
      ev(2, "board.layer", { layers: [{ id: "b", layer: 5 }, { id: "a", layer: 9 }] }),
    );
    expect(r.tokens.map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("delete 移除 token", () => {
    const before = [snap("a"), snap("b")];
    const r = applyEvent(before, ev(2, "board.delete", { token_ids: ["a"] }));
    expect(r.tokens.map((t) => t.id)).toEqual(["b"]);
  });

  it("pile 抽牌：新 token 落位 + 卡盒剩余更新", () => {
    const pileToken = snap("p", {
      pile: { group_id: "g", label: "牌堆", remaining: ["c1", "c2"], initial: ["c1", "c2"], total: 2 },
    });
    const r = applyEvent(
      [pileToken],
      ev(2, "board.pile", {
        action: "draw",
        pile_token_id: "p",
        count: 1,
        placed: [snap("t1", { x: 100, y: 200, card_id: "c1" })],
        pile_after: { remaining: ["c2"], initial: ["c1", "c2"], total: 2 },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.tokens.map((t) => t.id).sort()).toEqual(["p", "t1"]);
    expect(r.tokens.find((t) => t.id === "p")!.pile!.remaining).toEqual(["c2"]);
  });

  it("pile 洗牌只改卡盒，不新增 token", () => {
    const pileToken = snap("p", {
      pile: { group_id: "g", label: "牌堆", remaining: ["c1", "c2"], initial: ["c1", "c2"], total: 2 },
    });
    const r = applyEvent(
      [pileToken],
      ev(2, "board.pile", {
        action: "shuffle",
        pile_token_id: "p",
        pile_after: { remaining: ["c2", "c1"], initial: ["c1", "c2"], total: 2 },
      }),
    );
    expect(r.tokens).toHaveLength(1);
    expect(r.tokens[0].pile!.remaining).toEqual(["c2", "c1"]);
  });

  it("不改动入参（每一步都要留得住）", () => {
    const before = [snap("a", { x: 0, y: 0 })];
    const frozen = JSON.stringify(before);
    applyEvent(before, ev(2, "board.move", { to: [{ id: "a", x: 5, y: 5 }] }));
    expect(JSON.stringify(before)).toBe(frozen);
  });
});

describe("replayAt", () => {
  const events = [
    place("a", 0, 0),
    ev(2, "board.move", { to: [{ id: "a", x: 50, y: 60 }] }),
    ev(3, "board.flip", { token_ids: ["a"], face_down: true }),
  ];

  it("第 0 步是空棋盘", () => {
    expect(replayAt(events, 0).tokens).toEqual([]);
  });

  it("能跳到中间任意一步", () => {
    expect(replayAt(events, 1).tokens[0]).toMatchObject({ x: 0, y: 0, face_down: false });
    expect(replayAt(events, 2).tokens[0]).toMatchObject({ x: 50, y: 60, face_down: false });
    expect(replayAt(events, 3).tokens[0]).toMatchObject({ x: 50, y: 60, face_down: true });
  });

  it("越界夹紧而不抛错", () => {
    expect(replayAt(events, 99).tokens).toHaveLength(1);
    expect(replayAt(events, -5).tokens).toEqual([]);
  });

  it("缺 delta 的步骤被标记出来，且不影响后续步骤", () => {
    const withGap = [
      place("a", 0, 0),
      ev(2, "board.move", { token_ids: ["a"] }), // 老事件，没有 to
      ev(3, "board.flip", { token_ids: ["a"], face_down: true }),
    ];
    const r = replayAll(withGap);
    expect(r.degraded).toBe(true);
    expect(r.missingSteps).toEqual([1]);
    expect(r.tokens[0].face_down).toBe(true);
  });

  it("完整牌谱不标记降级", () => {
    expect(replayAll(events).degraded).toBe(false);
    expect(replayAll(events).missingSteps).toEqual([]);
  });
});

describe("isConsistent", () => {
  it("完整牌谱走完等于棋盘当前状态", () => {
    const events = [place("a", 1, 2), place("b", 3, 4)];
    expect(isConsistent(replayAll(events).tokens, [{ id: "a" }, { id: "b" }])).toBe(true);
  });

  it("漏记事件会被认出来", () => {
    const events = [place("a", 1, 2)];
    expect(isConsistent(replayAll(events).tokens, [{ id: "a" }, { id: "b" }])).toBe(false);
  });
});
