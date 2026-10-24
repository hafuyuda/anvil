import type { GameEvent } from "../../../core/ipc";
import type {
  BoardDeltas,
  LayerDelta,
  MoveDelta,
  PileState,
  ReplayState,
  TokenSnapshot,
} from "./types";

/**
 * 牌谱回放引擎。
 *
 * 为什么是正向 apply 而不是存快照：牌谱是「只追加」的流水（DESIGN §13），
 * 落盘时就该只写增量。代价是跳到第 N 步要重放前 N 条 —— 几千条事件的
 * 量级下仍是毫秒级，不值得为此把事件体积放大到每步一份全量 token。
 *
 * 硬约束（与剧本引擎 §16.4 同源）：本文件及其依赖闭包不得出现 DOM、
 * React、IPC、store —— 它要被打包进导出件，也要能在安卓端壳里跑。
 */

type Payload = Record<string, unknown> | null | undefined;

function payloadOf(ev: GameEvent): Payload {
  const p = ev.payload as Payload;
  return p && typeof p === "object" ? p : null;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** 从 payload 里挑出可用的 token 快照；格式不对就当没有（老数据 / 手改过）。 */
function readSnapshots(v: unknown): TokenSnapshot[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: TokenSnapshot[] = [];
  for (const raw of v) {
    if (!isObj(raw) || typeof raw.id !== "string") return null;
    out.push({
      id: raw.id,
      card_id: strOrNull(raw.card_id),
      name_override: strOrNull(raw.name_override),
      x: num(raw.x, 0),
      y: num(raw.y, 0),
      w: typeof raw.w === "number" ? raw.w : null,
      h: typeof raw.h === "number" ? raw.h : null,
      rotation: num(raw.rotation, 0),
      layer: num(raw.layer, 0),
      visible: raw.visible !== false,
      face_down: raw.face_down === true,
      pile: isObj(raw.pile)
        ? (raw.pile as unknown as TokenSnapshot["pile"])
        : null,
    });
  }
  return out;
}

function readMoves(v: unknown): MoveDelta[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: MoveDelta[] = [];
  for (const raw of v) {
    if (!isObj(raw) || typeof raw.id !== "string") return null;
    out.push({ id: raw.id, x: num(raw.x, 0), y: num(raw.y, 0) });
  }
  return out;
}

function readLayers(v: unknown): LayerDelta[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: LayerDelta[] = [];
  for (const raw of v) {
    if (!isObj(raw) || typeof raw.id !== "string") return null;
    out.push({ id: raw.id, layer: num(raw.layer, 0) });
  }
  return out;
}

function readIds(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: string[] = [];
  for (const raw of v) {
    if (typeof raw !== "string") return null;
    out.push(raw);
  }
  return out;
}

function readPileState(v: unknown): PileState | null {
  if (!isObj(v) || !Array.isArray(v.remaining) || !Array.isArray(v.initial)) {
    return null;
  }
  const remaining = v.remaining.filter((x): x is string => typeof x === "string");
  const initial = v.initial.filter((x): x is string => typeof x === "string");
  return {
    remaining,
    initial,
    total: typeof v.total === "number" ? v.total : initial.length,
  };
}

/** 从一条事件里提取回放所需的增量。没有任何可用增量时返回 null（该步不可回放）。 */
export function deltaOf(ev: GameEvent): BoardDeltas | null {
  const p = payloadOf(ev);
  if (!p) return null;

  switch (ev.kind) {
    case "board.place": {
      const tokens = readSnapshots(p.tokens);
      return tokens ? { place: { tokens } } : null;
    }
    case "board.move": {
      // from 只用于倒退；正向重放有 to 就够了，缺 to 才算不可回放
      const to = readMoves(p.to);
      if (!to) return null;
      const from = readMoves(p.from);
      return { move: { from: from ?? [], to } };
    }
    case "board.flip": {
      const ids = readIds(p.token_ids);
      if (!ids || typeof p.face_down !== "boolean") return null;
      return { flip: { face_down: p.face_down } };
    }
    case "board.layer": {
      const layers = readLayers(p.layers);
      if (!layers) return null;
      return { layer: { layers } };
    }
    case "board.delete": {
      const ids = readIds(p.token_ids);
      if (!ids) return null;
      const tokens = readSnapshots(p.tokens);
      return { delete: { tokens: tokens ?? [] } };
    }
    case "board.pile": {
      const placed = readSnapshots(p.placed);
      const pileAfter = readPileState(p.pile_after);
      if (!placed && !pileAfter) return null;
      return { pile: { placed: placed ?? [], pile_after: pileAfter ?? undefined } };
    }
    default:
      return null;
  }
}

/**
 * 把一条事件应用到 token 列表上，返回新的列表。
 *
 * 不改动入参（回放要在每一步都留得住，不能就地改）。
 */
export function applyEvent(
  tokens: TokenSnapshot[],
  ev: GameEvent,
): { tokens: TokenSnapshot[]; ok: boolean } {
  const delta = deltaOf(ev);
  const p = payloadOf(ev);
  if (!delta || !p) return { tokens, ok: false };

  if (delta.place) {
    const byId = new Map(tokens.map((t) => [t.id, t]));
    for (const t of delta.place.tokens) byId.set(t.id, t);
    return { tokens: sortByLayer([...byId.values()]), ok: true };
  }

  if (delta.move) {
    const moveTo = new Map(delta.move.to.map((m) => [m.id, m]));
    return {
      tokens: tokens.map((t) => {
        const m = moveTo.get(t.id);
        return m ? { ...t, x: m.x, y: m.y } : t;
      }),
      ok: true,
    };
  }

  if (delta.flip) {
    const ids = new Set(readIds(p.token_ids) ?? []);
    return {
      tokens: tokens.map((t) =>
        ids.has(t.id) ? { ...t, face_down: delta.flip!.face_down } : t,
      ),
      ok: true,
    };
  }

  if (delta.layer) {
    const layers = new Map(delta.layer.layers.map((l) => [l.id, l.layer]));
    return {
      tokens: sortByLayer(
        tokens.map((t) => {
          const l = layers.get(t.id);
          return l === undefined ? t : { ...t, layer: l };
        }),
      ),
      ok: true,
    };
  }

  if (delta.delete) {
    const ids = new Set(readIds(p.token_ids) ?? []);
    return { tokens: tokens.filter((t) => !ids.has(t.id)), ok: true };
  }

  if (delta.pile) {
    let next = tokens;
    if (delta.pile.placed && delta.pile.placed.length > 0) {
      const byId = new Map(next.map((t) => [t.id, t]));
      for (const t of delta.pile.placed) byId.set(t.id, t);
      next = [...byId.values()];
    }
    const after = delta.pile.pile_after;
    const pileId = typeof p.pile_token_id === "string" ? p.pile_token_id : null;
    if (after && pileId) {
      next = next.map((t) =>
        t.id === pileId && t.pile
          ? {
              ...t,
              pile: {
                ...t.pile,
                remaining: after.remaining,
                initial: after.initial,
                total: after.total,
              },
            }
          : t,
      );
    }
    return { tokens: sortByLayer(next), ok: true };
  }

  return { tokens, ok: false };
}

function sortByLayer(tokens: TokenSnapshot[]): TokenSnapshot[] {
  return [...tokens].sort((a, b) => a.layer - b.layer);
}

/**
 * 重放到第 `step` 步（0 = 空棋盘，`events.length` = 全部走完）。
 *
 * 越界会被夹紧，不抛错 —— 时间轴拖过头是常态。
 */
export function replayAt(events: GameEvent[], step: number): ReplayState {
  const n = Math.max(0, Math.min(step, events.length));
  let tokens: TokenSnapshot[] = [];
  let degraded = false;
  const missingSteps: number[] = [];

  for (let i = 0; i < n; i++) {
    const r = applyEvent(tokens, events[i]);
    if (!r.ok) {
      degraded = true;
      missingSteps.push(i);
    }
    tokens = r.tokens;
  }

  return { tokens, degraded, missingSteps };
}

/** 走完整条牌谱。 */
export function replayAll(events: GameEvent[]): ReplayState {
  return replayAt(events, events.length);
}

/**
 * 回放终点与棋盘当前状态对不对得上。
 *
 * 完整牌谱走完应当等于 `board.tokens`。对不上说明有产生方漏记了事件 ——
 * 那是代码 bug，不是用户数据坏了，所以只报不一致，不试图「修复」。
 */
export function isConsistent(
  replayed: TokenSnapshot[],
  current: { id: string }[],
): boolean {
  if (replayed.length !== current.length) return false;
  const a = new Set(replayed.map((t) => t.id));
  return current.every((t) => a.has(t.id));
}
