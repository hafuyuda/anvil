import type { PileData, Token } from "../../core/ipc";
import type { LayerDelta, MoveDelta, PileState, TokenSnapshot } from "./engine";

/**
 * 牌谱 delta 的构造处。
 *
 * 为什么集中在一个文件：delta 是「回放能不能对」的唯一保证，散在各调用点
 * 手写必然漏字段，而且漏了不会报错 —— 用户拖到第 40 步才发现棋盘不对，
 * 那时候已经无从查起。集中之后，新增一个产生方只需调一个函数。
 *
 * 与 `summary` 的分工：summary 是写给人看的（「移动「哥布林」」），
 * delta 是写给机器看的（从 (30,40) 到 (90,120)）。两者并存，互不替代。
 */

/** Token → 回放快照。丢掉 `value_overrides`（死字段，全链路恒 `{}`）。 */
export function snapshotOf(t: Token): TokenSnapshot {
  return {
    id: t.id,
    card_id: t.card_id ?? null,
    name_override: t.name_override ?? null,
    x: t.x,
    y: t.y,
    w: t.w ?? null,
    h: t.h ?? null,
    rotation: t.rotation ?? 0,
    layer: t.layer ?? 0,
    visible: t.visible !== false,
    face_down: t.face_down === true,
    pile: t.pile ?? null,
  };
}

export function snapshotsOf(tokens: Token[]): TokenSnapshot[] {
  return tokens.map(snapshotOf);
}

/** 卡盒的剩余牌面。洗牌 / 重置 / 同步 / 抽牌都要记它。 */
export function pileStateOf(pile: PileData | null | undefined): PileState | null {
  if (!pile) return null;
  return {
    remaining: [...pile.remaining],
    initial: [...pile.initial],
    total: pile.total,
  };
}

export interface PlaceArgs {
  tokens: Token[];
  source: string;
  summary: string;
  cardIds?: string[];
}

export function placePayload({ tokens, source, summary, cardIds }: PlaceArgs) {
  return {
    token_ids: tokens.map((t) => t.id),
    card_ids: cardIds ?? tokens.map((t) => t.card_id ?? null),
    count: tokens.length,
    source,
    summary,
    tokens: snapshotsOf(tokens),
  };
}

export interface MoveArgs {
  before: Token[];
  after: Token[];
  summary: string;
}

/** 只记真正动了的 token —— 一次拖拽可能只挪了选中项里的一部分。 */
export function movePayload({ before, after, summary }: MoveArgs) {
  const beforeById = new Map(before.map((t) => [t.id, t]));
  const from: MoveDelta[] = [];
  const to: MoveDelta[] = [];
  for (const nt of after) {
    const old = beforeById.get(nt.id);
    if (!old) continue;
    if (old.x === nt.x && old.y === nt.y) continue;
    from.push({ id: nt.id, x: old.x, y: old.y });
    to.push({ id: nt.id, x: nt.x, y: nt.y });
  }
  return {
    token_ids: to.map((m) => m.id),
    count: to.length,
    summary,
    from,
    to,
  };
}

export interface FlipArgs {
  tokenIds: string[];
  faceDown: boolean;
  summary: string;
}

export function flipPayload({ tokenIds, faceDown, summary }: FlipArgs) {
  return {
    token_ids: tokenIds,
    count: tokenIds.length,
    face_down: faceDown,
    summary,
  };
}

export interface LayerArgs {
  tokens: Token[];
  where: "front" | "back";
  summary: string;
}

/** 层序调整后逐个记 layer —— 置顶/置底会重排一批，只记 where 回放不出来。 */
export function layerPayload({ tokens, where, summary }: LayerArgs) {
  const layers: LayerDelta[] = tokens.map((t) => ({ id: t.id, layer: t.layer }));
  return {
    token_ids: tokens.map((t) => t.id),
    count: tokens.length,
    where,
    summary,
    layers,
  };
}

export interface DeleteArgs {
  removed: Token[];
  summary: string;
}

export function deletePayload({ removed, summary }: DeleteArgs) {
  return {
    token_ids: removed.map((t) => t.id),
    count: removed.length,
    summary,
    tokens: snapshotsOf(removed),
  };
}

export interface PileArgs {
  action: "draw" | "shuffle" | "reset" | "sync";
  pileTokenId: string;
  summary: string;
  count?: number;
  /** 抽牌时新增到棋盘上的 token（含落位坐标） */
  placed?: Token[];
  /** 动作之后卡盒的剩余牌面 */
  pileAfter?: PileData | null;
}

export function pilePayload({
  action,
  pileTokenId,
  summary,
  count,
  placed,
  pileAfter,
}: PileArgs) {
  return {
    action,
    pile_token_id: pileTokenId,
    count: count ?? placed?.length ?? 0,
    summary,
    ...(placed && placed.length > 0 ? { placed: snapshotsOf(placed) } : {}),
    ...(pileAfter ? { pile_after: pileStateOf(pileAfter) } : {}),
  };
}
