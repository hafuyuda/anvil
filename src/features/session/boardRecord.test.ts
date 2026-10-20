import { describe, expect, it } from "vitest";
import type { Card, GameEvent, Token } from "../../core/ipc";
import {
  applyBoardStep,
  BOARD_STEP_KIND,
  diffSnapshots,
  drawStep,
  extractBoardSteps,
  findStartSnapshot,
  formatReplayText,
  formatStep,
  isEmptyStep,
  pileStep,
  replayTo,
  toSnapshots,
  type BoardStepPayload,
  type SnapshotToken,
} from "./boardRecord";

function card(id: string, name: string): Card {
  return {
    id,
    type_id: "t1",
    name,
    values: {},
    created_at: 0,
    updated_at: 0,
  };
}

function token(
  id: string,
  x: number,
  y: number,
  extra: Partial<Token> = {},
): Token {
  return {
    id,
    card_id: null,
    name_override: null,
    value_overrides: {},
    x,
    y,
    rotation: 0,
    layer: 0,
    visible: true,
    ...extra,
  };
}

const cards = [card("c1", "索林"), card("c2", "巴林")];

function snap(
  id: string,
  x: number,
  y: number,
  extra: Partial<SnapshotToken> = {},
): SnapshotToken {
  return {
    id,
    card_id: null,
    name: id,
    x,
    y,
    w: null,
    h: null,
    rotation: 0,
    layer: 0,
    visible: true,
    face_down: false,
    is_pile: false,
    pile_remaining: null,
    ...extra,
  };
}

function ev(seq: number, kind: string, payload: unknown, note?: string) {
  return { seq, at: seq * 1000, kind, payload, note: note ?? null } as GameEvent;
}

describe("toSnapshots", () => {
  it("优先取卡名", () => {
    const out = toSnapshots([token("t1", 0, 0, { card_id: "c1" })], cards);
    expect(out[0].name).toBe("索林");
    expect(out[0].card_id).toBe("c1");
  });

  it("改名覆盖卡名", () => {
    const out = toSnapshots(
      [token("t1", 0, 0, { card_id: "c1", name_override: "矮人王" })],
      cards,
    );
    expect(out[0].name).toBe("矮人王");
  });

  it("卡被删了也不丢名字", () => {
    const out = toSnapshots([token("tok_abcdef", 0, 0, { card_id: "cgone" })], []);
    expect(out[0].name).toBe("Token tok_ab");
  });

  it("卡盒记下剩余张数", () => {
    const t = token("t1", 0, 0, {
      name_override: "遭遇堆",
      pile: {
        group_id: "g",
        label: "遭遇堆",
        remaining: ["a", "b", "c"],
        initial: ["a", "b", "c", "d"],
        total: 4,
      },
    });
    const out = toSnapshots([t], cards);
    expect(out[0]).toMatchObject({
      is_pile: true,
      pile_remaining: 3,
      name: "遭遇堆",
    });
  });
});

describe("diffSnapshots", () => {
  it("检出位移", () => {
    const before = [snap("t1", 100, 100), snap("t2", 200, 200)];
    const after = [snap("t1", 150, 100), snap("t2", 200, 200)];
    const step = diffSnapshots(before, after);
    expect(step.moves).toEqual([
      { id: "t1", name: "t1", from: [100, 100], to: [150, 100] },
    ]);
  });

  it("吸附抖动不算移动", () => {
    const before = [snap("t1", 100, 100)];
    const after = [snap("t1", 100.3, 100.2)];
    expect(isEmptyStep(diffSnapshots(before, after))).toBe(true);
  });

  it("一次拖拽多个 token 合成一步", () => {
    const before = [snap("t1", 0, 0), snap("t2", 10, 10), snap("t3", 20, 20)];
    const after = [snap("t1", 5, 0), snap("t2", 15, 10), snap("t3", 20, 20)];
    expect(diffSnapshots(before, after).moves).toHaveLength(2);
  });

  it("检出翻面", () => {
    const before = [snap("t1", 0, 0, { face_down: false })];
    const after = [snap("t1", 0, 0, { face_down: true })];
    expect(diffSnapshots(before, after).flips).toEqual([
      { id: "t1", name: "t1", face_down: true },
    ]);
  });

  it("检出移除", () => {
    const before = [snap("t1", 0, 0), snap("t2", 5, 5)];
    const after = [snap("t1", 0, 0)];
    expect(diffSnapshots(before, after).removes).toEqual([
      { id: "t2", name: "t2" },
    ]);
  });

  it("新增留给抽牌路径，diff 不猜", () => {
    const before = [snap("t1", 0, 0)];
    const after = [snap("t1", 0, 0), snap("t2", 40, 40)];
    const step = diffSnapshots(before, after);
    expect(step.draws).toBeUndefined();
    expect(isEmptyStep(step)).toBe(true);
  });

  it("只改图层不记", () => {
    const before = [snap("t1", 0, 0, { layer: 1 })];
    const after = [snap("t1", 0, 0, { layer: 9 })];
    expect(isEmptyStep(diffSnapshots(before, after))).toBe(true);
  });
});

describe("applyBoardStep", () => {
  it("移动的 token 落到新位置", () => {
    const out = applyBoardStep([snap("t1", 0, 0)], {
      moves: [{ id: "t1", name: "t1", from: [0, 0], to: [30, 40] }],
    });
    expect(out[0]).toMatchObject({ x: 30, y: 40 });
  });

  it("抽出的牌扣着放进棋盘", () => {
    const out = applyBoardStep([], {
      draws: [
        {
          id: "nt1",
          card_id: "c1",
          name: "索林",
          to: [10, 20],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      x: 10,
      y: 20,
      face_down: true,
      layer: 1,
    });
  });

  it("多张抽牌图层递增，不叠死", () => {
    const step: BoardStepPayload = {
      draws: [1, 2, 3].map((i) => ({
        id: `nt${i}`,
        card_id: null,
        name: `牌${i}`,
        to: [i * 10, 0],
        pile_id: "p1",
        pile_name: "遭遇堆",
      })),
    };
    const out = applyBoardStep([snap("t0", 0, 0, { layer: 5 })], step);
    expect(out.map((t) => t.layer)).toEqual([5, 6, 7, 8]);
  });

  it("卡盒余量跟着抽牌变化", () => {
    const pile = snap("p1", 0, 0, { is_pile: true, pile_remaining: 5 });
    const out = applyBoardStep([pile], {
      piles: [{ kind: "shuffle", pile_id: "p1", pile_name: "遭遇堆", remaining: 2 }],
    });
    expect(out[0].pile_remaining).toBe(2);
  });

  it("抽牌同时扣减来源卡盒的余量", () => {
    const pile = snap("p1", 0, 0, { is_pile: true, pile_remaining: 5 });
    const out = applyBoardStep([pile], {
      draws: [
        {
          id: "n1",
          card_id: "c1",
          name: "索林",
          to: [10, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
        {
          id: "n2",
          card_id: "c2",
          name: "巴林",
          to: [20, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
      ],
    });
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ id: "p1", pile_remaining: 3 });
  });

  it("卡盒抽空不会记成负数", () => {
    const pile = snap("p1", 0, 0, { is_pile: true, pile_remaining: 1 });
    const out = applyBoardStep([pile], {
      draws: [
        {
          id: "n1",
          card_id: "c1",
          name: "索林",
          to: [0, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
        {
          id: "n2",
          card_id: "c2",
          name: "巴林",
          to: [0, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
      ],
    });
    expect(out[0].pile_remaining).toBe(0);
  });

  it("移除优先于其它操作，被移的不再移动", () => {
    const out = applyBoardStep([snap("t1", 0, 0), snap("t2", 0, 0)], {
      removes: [{ id: "t1", name: "t1" }],
      moves: [
        { id: "t1", name: "t1", from: [0, 0], to: [99, 99] },
        { id: "t2", name: "t2", from: [0, 0], to: [7, 7] },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "t2", x: 7 });
  });
});

describe("drawStep / pileStep", () => {
  const pileBefore = snap("p1", 0, 0, {
    name: "遭遇堆",
    is_pile: true,
    pile_remaining: 5,
  });

  it("抽出的牌记下来源卡盒", () => {
    const after = [
      snap("p1", 0, 0, {
        name: "遭遇堆",
        is_pile: true,
        pile_remaining: 3,
      }),
      snap("n1", 10, 0, { name: "索林" }),
      snap("n2", 20, 0, { name: "巴林" }),
    ];
    const step = drawStep([pileBefore], after, "p1");
    expect(step.draws?.map((d) => d.name)).toEqual(["索林", "巴林"]);
    expect(step.draws?.[0]).toMatchObject({
      pile_id: "p1",
      pile_name: "遭遇堆",
      to: [10, 0],
    });
  });

  it("牌堆空了就无牌可抽，不记", () => {
    expect(isEmptyStep(drawStep([pileBefore], [pileBefore], "p1"))).toBe(true);
  });

  it("洗牌与重置只记余量", () => {
    const after = [
      snap("p1", 0, 0, { name: "遭遇堆", is_pile: true, pile_remaining: 7 }),
    ];
    expect(pileStep(after, "p1", "shuffle").piles).toEqual([
      { kind: "shuffle", pile_id: "p1", pile_name: "遭遇堆", remaining: 7 },
    ]);
    expect(pileStep(after, "p1", "reset").piles?.[0]).toMatchObject({
      kind: "reset",
      remaining: 7,
    });
  });

  it("普通 token 不是卡盒，不记余量", () => {
    expect(isEmptyStep(pileStep([snap("t1", 0, 0)], "t1", "shuffle"))).toBe(true);
  });
});

describe("replayTo", () => {
  const start = [snap("t1", 0, 0)];
  const steps: BoardStepPayload[] = [
    { moves: [{ id: "t1", name: "t1", from: [0, 0], to: [10, 0] }] },
    { moves: [{ id: "t1", name: "t1", from: [10, 0], to: [20, 0] }] },
    { moves: [{ id: "t1", name: "t1", from: [20, 0], to: [30, 0] }] },
  ];

  it("第 0 步是起点", () => {
    expect(replayTo(start, steps, 0)[0].x).toBe(0);
  });

  it("逐步前进", () => {
    expect(replayTo(start, steps, 1)[0].x).toBe(10);
    expect(replayTo(start, steps, 3)[0].x).toBe(30);
  });

  it("越界钳制，不崩", () => {
    expect(replayTo(start, steps, 99)[0].x).toBe(30);
    expect(replayTo(start, steps, -5)[0].x).toBe(0);
  });

  it("不改动起点快照本身", () => {
    replayTo(start, steps, 3);
    expect(start[0].x).toBe(0);
  });
});

describe("extractBoardSteps", () => {
  it("只挑牌谱步骤，跳过其它事件", () => {
    const out = extractBoardSteps([
      ev(1, "chat.say", { content: "hi" }),
      ev(2, BOARD_STEP_KIND, {
        moves: [{ id: "t1", name: "t1", from: [0, 0], to: [1, 1] }],
      }),
      ev(3, "combat.turn", { round: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].seq).toBe(2);
  });

  it("空步骤不进牌谱", () => {
    expect(extractBoardSteps([ev(1, BOARD_STEP_KIND, {})])).toHaveLength(0);
  });
});

describe("findStartSnapshot", () => {
  const snaps = [snap("t1", 0, 0)];

  it("取快照作为回放起点", () => {
    const found = findStartSnapshot([
      ev(1, "session.start", { board_id: "b1", tokens: snaps }),
    ]);
    expect(found).toHaveLength(1);
  });

  it("切过棋盘就取最近一次", () => {
    const older = [snap("old", 0, 0)];
    const newer = [snap("new", 0, 0), snap("new2", 5, 5)];
    const found = findStartSnapshot([
      ev(1, "session.start", { board_id: "b1", tokens: older }),
      ev(5, "session.start", { board_id: "b2", tokens: newer }),
    ]);
    expect(found?.map((t) => t.id)).toEqual(["new", "new2"]);
  });

  it("没有快照就返回 null，由界面提示", () => {
    expect(findStartSnapshot([ev(1, "session.start", { board_id: "b1" })])).toBeNull();
  });
});

describe("formatStep", () => {
  it("单个移动带坐标", () => {
    expect(
      formatStep({
        moves: [{ id: "t1", name: "索林", from: [0, 0], to: [120, 60] }],
      }),
    ).toBe("索林 移动 0,0 → 120,60");
  });

  it("多 token 只列名，不刷屏", () => {
    const text = formatStep({
      moves: [
        { id: "t1", name: "索林", from: [0, 0], to: [10, 0] },
        { id: "t2", name: "巴林", from: [0, 0], to: [20, 0] },
      ],
    });
    expect(text).toBe("移动 2 个：索林、巴林");
  });

  it("抽牌带来源卡盒", () => {
    const text = formatStep({
      draws: [
        {
          id: "n1",
          card_id: "c1",
          name: "索林",
          to: [0, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
        {
          id: "n2",
          card_id: "c2",
          name: "巴林",
          to: [10, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
      ],
    });
    expect(text).toBe("从「遭遇堆」抽出 2 张：索林、巴林");
  });

  it("洗牌与重置分开措辞", () => {
    expect(
      formatStep({
        piles: [
          { kind: "shuffle", pile_id: "p1", pile_name: "遭遇堆", remaining: 8 },
        ],
      }),
    ).toBe("「遭遇堆」洗牌，剩 8 张");
    expect(
      formatStep({
        piles: [{ kind: "reset", pile_id: "p1", pile_name: "遭遇堆", remaining: 12 }],
      }),
    ).toBe("「遭遇堆」重置，剩 12 张");
  });

  it("翻面与移除", () => {
    expect(
      formatStep({ flips: [{ id: "t1", name: "索林", face_down: true }] }),
    ).toBe("索林 扣下");
    expect(
      formatStep({ flips: [{ id: "t1", name: "索林", face_down: false }] }),
    ).toBe("索林 翻开");
    expect(formatStep({ removes: [{ id: "t1", name: "索林" }] })).toBe(
      "移除 1 个：索林",
    );
  });
});

describe("formatReplayText", () => {
  it("编号并附上备注", () => {
    const text = formatReplayText([
      {
        seq: 1,
        at: 0,
        note: "开局布局",
        step: {
          moves: [{ id: "t1", name: "索林", from: [0, 0], to: [10, 0] }],
        },
      },
      {
        seq: 2,
        at: 1,
        note: null,
        step: { flips: [{ id: "t1", name: "索林", face_down: true }] },
      },
    ]);
    expect(text.split("\n")[0]).toBe("  1. 索林 移动 0,0 → 10,0　// 开局布局");
    expect(text.split("\n")[1]).toBe("  2. 索林 扣下");
  });
});

describe("端到端：抽牌后移动", () => {
  const start = [
    snap("p1", 0, 0, { name: "遭遇堆", is_pile: true, pile_remaining: 2 }),
  ];
  const steps: BoardStepPayload[] = [
    {
      draws: [
        {
          id: "n1",
          card_id: "c1",
          name: "索林",
          to: [10, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
        {
          id: "n2",
          card_id: "c2",
          name: "巴林",
          to: [20, 0],
          pile_id: "p1",
          pile_name: "遭遇堆",
        },
      ],
    },
    { moves: [{ id: "n1", name: "索林", from: [10, 0], to: [50, 50] }] },
    { flips: [{ id: "n1", name: "索林", face_down: false }] },
  ];

  it("重放到最新时棋盘与实际一致", () => {
    const out = replayTo(start, steps, 3);
    const n1 = out.find((t) => t.id === "n1");
    const n2 = out.find((t) => t.id === "n2");
    expect(n1).toMatchObject({ x: 50, y: 50, face_down: false });
    expect(n2).toMatchObject({ x: 20, y: 0, face_down: true });
    expect(out.find((t) => t.id === "p1")?.pile_remaining).toBe(0);
  });

  it("中途停下时后续步骤还没发生", () => {
    const out = replayTo(start, steps, 1);
    expect(out).toHaveLength(3);
    expect(out.find((t) => t.id === "n1")).toMatchObject({
      x: 10,
      face_down: true,
    });
  });

  it("整局可导出成编号棋谱", () => {
    const text = formatReplayText(
      steps.map((s, i) => ({ seq: i + 1, at: i, note: null, step: s })),
    );
    expect(text.split("\n")).toEqual([
      "  1. 从「遭遇堆」抽出 2 张：索林、巴林",
      "  2. 索林 移动 10,0 → 50,50",
      "  3. 索林 翻开",
    ]);
  });
});
