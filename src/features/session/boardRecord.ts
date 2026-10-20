import type { Card, GameEvent, Token } from "../../core/ipc";

/**
 * 牌谱：把棋盘上的动作记成一条条可回放的步骤。
 *
 * 关键取舍：记录的是「哪一步发生了什么」，不是「棋盘长什么样」。
 * 当前棋盘状态始终由 session.tokens 负责，牌谱只负责从起点重放。
 *
 * 名字一律随事件存一份 —— 卡牌可能之后被删，牌谱不该跟着变空。
 */

/** 回放时渲染一个 token 所需的全部信息 */
export interface SnapshotToken {
  id: string;
  card_id: string | null;
  name: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  rotation: number;
  layer: number;
  visible: boolean;
  face_down: boolean;
  is_pile: boolean;
  pile_remaining: number | null;
}

export interface TokenMove {
  id: string;
  name: string;
  from: [number, number];
  to: [number, number];
}

export interface TokenDraw {
  id: string;
  card_id: string | null;
  name: string;
  to: [number, number];
  pile_id: string;
  pile_name: string;
}

export interface TokenFlip {
  id: string;
  name: string;
  face_down: boolean;
}

export interface TokenRemove {
  id: string;
  name: string;
}

export interface PileChange {
  kind: "shuffle" | "reset";
  pile_id: string;
  pile_name: string;
  remaining: number;
}

/**
 * 一步牌谱。各分类可以并存 —— 一次拖拽可能同时移动多个 token。
 * payload 为空意味着这次改动不值得记（比如只改了图层），调用方应跳过。
 */
export interface BoardStepPayload {
  moves?: TokenMove[];
  draws?: TokenDraw[];
  flips?: TokenFlip[];
  removes?: TokenRemove[];
  piles?: PileChange[];
}

/** 小于这个位移不算移动，避免吸附抖动刷出噪音步骤 */
const MOVE_EPSILON = 0.5;

export const BOARD_STEP_KIND = "board.step";

/** 卡牌被删后 token 还在，名字退回类型名或 id 短名 */
function fallbackName(token: Token): string {
  return `Token ${token.id.slice(0, 6)}`;
}

export function toSnapshots(tokens: Token[], cards: Card[]): SnapshotToken[] {
  return tokens.map((t) => {
    const card = t.card_id ? cards.find((c) => c.id === t.card_id) : undefined;
    const name = t.name_override || card?.name || fallbackName(t);
    return {
      id: t.id,
      card_id: t.card_id ?? null,
      name,
      x: t.x,
      y: t.y,
      w: t.w ?? null,
      h: t.h ?? null,
      rotation: t.rotation ?? 0,
      layer: t.layer ?? 0,
      visible: t.visible ?? true,
      face_down: t.face_down ?? false,
      is_pile: !!t.pile,
      pile_remaining: t.pile ? t.pile.remaining.length : null,
    };
  });
}

/** 卡盒的名字优先用卡组标签，否则退回卡盒 token 的自有名字 */
function pileName(snap: SnapshotToken): string {
  return snap.name || `卡盒 ${snap.id.slice(0, 6)}`;
}

/**
 * 比较两帧棋盘快照，得出这一步做了什么。
 *
 * 抽牌不在 diff 里判定 —— 它无法从快照区分「抽出」和「新增一个普通 token」。
 * 抽牌 / 洗牌 / 重置由调用方在动作发生时显式记录，见 currentPileRemaining。
 */
export function diffSnapshots(
  prev: SnapshotToken[],
  next: SnapshotToken[],
): BoardStepPayload {
  const prevMap = new Map(prev.map((t) => [t.id, t]));
  const nextMap = new Map(next.map((t) => [t.id, t]));

  const moves: TokenMove[] = [];
  const flips: TokenFlip[] = [];
  const removes: TokenRemove[] = [];

  for (const t of next) {
    const before = prevMap.get(t.id);
    if (!before) continue; // 新增的 token 由抽牌路径负责记录

    const dx = Math.abs(t.x - before.x);
    const dy = Math.abs(t.y - before.y);
    if (dx > MOVE_EPSILON || dy > MOVE_EPSILON) {
      moves.push({
        id: t.id,
        name: t.name,
        from: [before.x, before.y],
        to: [t.x, t.y],
      });
    }

    if (t.face_down !== before.face_down) {
      flips.push({ id: t.id, name: t.name, face_down: t.face_down });
    }
  }

  for (const t of prev) {
    if (!nextMap.has(t.id)) {
      removes.push({ id: t.id, name: t.name });
    }
  }

  const step: BoardStepPayload = {};
  if (moves.length) step.moves = moves;
  if (flips.length) step.flips = flips;
  if (removes.length) step.removes = removes;
  return step;
}

/**
 * 抽牌这一步。抽了哪些牌能从两帧快照的差集算出来，
 * 但「洗牌」和「重置」改变的是牌序，快照里看不出来 —— 那两个由调用方直接声明。
 */
export function drawStep(
  before: SnapshotToken[],
  after: SnapshotToken[],
  pileTokenId: string,
): BoardStepPayload {
  const beforeIds = new Set(before.map((t) => t.id));
  const pile = before.find((t) => t.id === pileTokenId);
  const draws: TokenDraw[] = after
    .filter((t) => !beforeIds.has(t.id))
    .map((t) => ({
      id: t.id,
      card_id: t.card_id,
      name: t.name,
      to: [t.x, t.y] as [number, number],
      pile_id: pileTokenId,
      pile_name: pile ? pileName(pile) : pileTokenId,
    }));
  if (!draws.length) return {};
  return { draws };
}

/** 洗牌 / 重置：只记卡盒余量，牌序不进牌谱（记了也无从回放） */
export function pileStep(
  after: SnapshotToken[],
  pileTokenId: string,
  kind: "shuffle" | "reset",
): BoardStepPayload {
  const pile = after.find((t) => t.id === pileTokenId);
  if (!pile || pile.pile_remaining == null) return {};
  return {
    piles: [
      {
        kind,
        pile_id: pileTokenId,
        pile_name: pileName(pile),
        remaining: pile.pile_remaining,
      },
    ],
  };
}

/** 一步里是否没有任何值得记的内容 */
export function isEmptyStep(step: BoardStepPayload): boolean {
  return (
    !step.moves?.length &&
    !step.draws?.length &&
    !step.flips?.length &&
    !step.removes?.length &&
    !step.piles?.length
  );
}

function coord(n: number): number {
  return Math.round(n);
}

/**
 * 把一步重放到快照上，得到新的快照。
 * 顺序有讲究：先入新牌，再处置卡盒，最后才移动 —— 与真实操作顺序一致。
 */
export function applyBoardStep(
  tokens: SnapshotToken[],
  step: BoardStepPayload,
): SnapshotToken[] {
  let out = tokens;

  if (step.removes?.length) {
    const gone = new Set(step.removes.map((r) => r.id));
    out = out.filter((t) => !gone.has(t.id));
  }

  if (step.draws?.length) {
    const maxLayer = out.reduce((m, t) => Math.max(m, t.layer), 0);
    const added: SnapshotToken[] = step.draws.map((d, i) => ({
      id: d.id,
      card_id: d.card_id,
      name: d.name,
      x: d.to[0],
      y: d.to[1],
      w: null,
      h: null,
      rotation: 0,
      layer: maxLayer + 1 + i,
      visible: true,
      face_down: true,
      is_pile: false,
      pile_remaining: null,
    }));
    // 抽走的牌要从来源卡盒的余量里扣掉 —— 否则回放时卡盒数字不会掉
    const taken = new Map<string, number>();
    for (const d of step.draws) {
      taken.set(d.pile_id, (taken.get(d.pile_id) ?? 0) + 1);
    }
    out = [...out, ...added].map((t) => {
      const n = taken.get(t.id);
      if (n == null || t.pile_remaining == null) return t;
      return { ...t, pile_remaining: Math.max(0, t.pile_remaining - n) };
    });
  }

  if (step.piles?.length) {
    const byPile = new Map(step.piles.map((p) => [p.pile_id, p]));
    out = out.map((t) => {
      const p = byPile.get(t.id);
      if (!p) return t;
      return { ...t, pile_remaining: p.remaining };
    });
  }

  if (step.moves?.length) {
    const byId = new Map(step.moves.map((m) => [m.id, m]));
    out = out.map((t) => {
      const m = byId.get(t.id);
      if (!m) return t;
      return { ...t, x: m.to[0], y: m.to[1] };
    });
  }

  if (step.flips?.length) {
    const byId = new Map(step.flips.map((f) => [f.id, f]));
    out = out.map((t) => {
      const f = byId.get(t.id);
      if (!f) return t;
      return { ...t, face_down: f.face_down };
    });
  }

  return out;
}

/** 从起点重放到第 n 步（n = 0 即起点，n = 步数 即最新） */
export function replayTo(
  start: SnapshotToken[],
  steps: BoardStepPayload[],
  n: number,
): SnapshotToken[] {
  const k = Math.max(0, Math.min(n, steps.length));
  let out = start;
  for (let i = 0; i < k; i++) {
    out = applyBoardStep(out, steps[i]);
  }
  return out;
}

export interface BoardStepRecord {
  seq: number;
  at: number;
  note: string | null;
  step: BoardStepPayload;
}

function asStep(payload: unknown): BoardStepPayload | null {
  if (!payload || typeof payload !== "object") return null;
  return payload as BoardStepPayload;
}

/** 从事件流里抽出牌谱步骤，按 seq 排序 —— 事件流本来就是牌谱的载体 */
export function extractBoardSteps(events: GameEvent[]): BoardStepRecord[] {
  const out: BoardStepRecord[] = [];
  for (const e of events) {
    if (e.kind !== BOARD_STEP_KIND) continue;
    const step = asStep(e.payload);
    if (!step || isEmptyStep(step)) continue;
    out.push({ seq: e.seq, at: e.at, note: e.note ?? null, step });
  }
  return out;
}

/**
 * 回放起点：最近一次棋盘快照。
 * 没有快照的旧会话无法回放 —— 这时返回 null，由界面提示去切一次棋盘。
 */
export function findStartSnapshot(events: GameEvent[]): SnapshotToken[] | null {
  let found: SnapshotToken[] | null = null;
  for (const e of events) {
    if (e.kind !== "session.start") continue;
    const p = e.payload as { tokens?: SnapshotToken[] } | null;
    if (p?.tokens?.length) found = p.tokens;
  }
  return found;
}

export function describeMove(m: TokenMove): string {
  return `${m.name} 移动 ${coord(m.from[0])},${coord(m.from[1])} → ${coord(m.to[0])},${coord(m.to[1])}`;
}

/** 一步的人类可读摘要。多 token 拖拽合并成一句。 */
export function formatStep(step: BoardStepPayload): string {
  const parts: string[] = [];

  if (step.draws?.length) {
    const byPile = new Map<string, TokenDraw[]>();
    for (const d of step.draws) {
      const arr = byPile.get(d.pile_id) ?? [];
      arr.push(d);
      byPile.set(d.pile_id, arr);
    }
    for (const [pileId, draws] of byPile) {
      const pname = draws[0].pile_name ?? pileId;
      const names = draws.map((d) => d.name).join("、");
      parts.push(`从「${pname}」抽出 ${draws.length} 张：${names}`);
    }
  }

  if (step.piles?.length) {
    for (const p of step.piles) {
      const verb = p.kind === "shuffle" ? "洗牌" : "重置";
      parts.push(`「${p.pile_name}」${verb}，剩 ${p.remaining} 张`);
    }
  }

  if (step.moves?.length) {
    if (step.moves.length === 1) {
      parts.push(describeMove(step.moves[0]));
    } else {
      parts.push(`移动 ${step.moves.length} 个：${step.moves.map((m) => m.name).join("、")}`);
    }
  }

  if (step.flips?.length) {
    for (const f of step.flips) {
      parts.push(`${f.name} ${f.face_down ? "扣下" : "翻开"}`);
    }
  }

  if (step.removes?.length) {
    parts.push(`移除 ${step.removes.length} 个：${step.removes.map((r) => r.name).join("、")}`);
  }

  return parts.join("；");
}

/** 导出棋谱式文本，编号 + 摘要 + 备注 */
export function formatReplayText(steps: BoardStepRecord[]): string {
  const lines: string[] = [];
  steps.forEach((s, i) => {
    const n = String(i + 1).padStart(3, " ");
    const note = s.note ? `　// ${s.note}` : "";
    lines.push(`${n}. ${formatStep(s.step)}${note}`);
  });
  return lines.join("\n");
}
