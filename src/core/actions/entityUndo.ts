import { clamp } from "../../lib/math";
import {
  ipc,
  type Board,
  type Card,
  type CardGroup,
  type PileData,
  type Relation,
  type Session,
  type Token,
} from "../ipc";
import { useProjectStore } from "../../stores/projectStore";
import { nowMs } from "../../lib/time";
import { deepEqual, insertAtIndices } from "../../lib/undoMerge";
import { reloadIntoStore } from "./reloadIntoStore";

/**
 * 删除操作的数据级撤销。
 *
 * 后端删一张卡 / 一个卡组 / 一个棋盘时，会连带摘掉一大堆引用（见
 * `refs.rs` 的 purge_*）。前端此前的 restore 只把本体 save 回去，
 * 关系网不回——卡是回来了，可它挂在棋盘上的棋子、卡盒里的牌、关系边、
 * 卡组成员身份全丢了。
 *
 * 这里的做法是：删除前从 store 采集一份「足迹」（被牵连的实体原样），
 * 撤销时按 id 与当前状态合并，只把这次删除摘掉的东西按原位置插回去。
 * 用户在删除之后又做的编辑（移动别的 Token、绑了别的棋盘）不会被吞。
 */

// ───────────────── 纯函数部分（可单测） ─────────────────

/** 后端 Detach 模式留下的墓碑后缀。据此判断名字是否还是墓碑、用户有没有改过。 */
const TOMBSTONE_SUFFIX = "（已删除）";

export function tokensTouchCard(tokens: Token[], cardId: string): boolean {
  return (tokens ?? []).some(
    (t) => t.card_id === cardId || pileHasCard(t.pile, cardId),
  );
}

function pileHasCard(pile: PileData | null | undefined, cardId: string): boolean {
  if (!pile) return false;
  return pile.remaining.includes(cardId) || pile.initial.includes(cardId);
}

/** 把一张卡插回牌堆列表的原位置。before 里没有的（当时已被抽走）不插。 */
export function insertCardIntoPileList(
  current: string[],
  before: string[],
  cardId: string,
): string[] {
  if (!before.includes(cardId) || current.includes(cardId)) return current;
  const idx = before.indexOf(cardId);
  const out = [...current];
  out.splice(clamp(idx, 0, out.length), 0, cardId);
  return out;
}

/**
 * 还原牌堆内容。total 是「初始总张数」，跟着 initial 走 ——
 * 与后端 `strip_pile` 的算法保持一致。
 */
export function restorePileData(
  current: PileData,
  before: PileData,
  cardId: string,
): PileData {
  const remaining = insertCardIntoPileList(current.remaining, before.remaining, cardId);
  const initial = insertCardIntoPileList(current.initial, before.initial, cardId);
  if (remaining === current.remaining && initial === current.initial) {
    return current;
  }
  return { ...current, remaining, initial, total: initial.length };
}

/**
 * 撤销「删卡」对一堆 token 的影响。
 * before = 删除前的列表，current = store 里的当前列表。
 *
 * 三件事：
 *  (a) 被整枚删掉的（Remove 模式）→ 按原索引插回
 *  (b) 指针被断开的（Detach 模式）→ 恢复 card_id，名字仍是墓碑才恢复名字
 *  (c) 卡盒里被摘掉的牌 → 插回 remaining / initial 的原位置
 */
export function restoreTokensForCard(
  before: Token[],
  current: Token[],
  cardId: string,
): Token[] {
  const currentIds = new Set(current.map((t) => t.id));

  const inserts = before
    .map((t, i) => ({ item: t, index: i }))
    .filter(({ item }) => !currentIds.has(item.id) && tokensTouchCard([item], cardId));
  const reinserted = insertAtIndices(current, inserts);

  return reinserted.map((t) => {
    const b = before.find((x) => x.id === t.id);
    if (!b) return t;
    if (b.card_id === cardId && t.card_id == null) {
      const nameStillTombstone =
        t.name_override == null || t.name_override.endsWith(TOMBSTONE_SUFFIX);
      return {
        ...t,
        card_id: cardId,
        name_override: nameStillTombstone ? (b.name_override ?? null) : t.name_override,
      };
    }
    if (t.pile && b.pile) {
      const pile = restorePileData(t.pile, b.pile, cardId);
      if (pile !== t.pile) return { ...t, pile };
    }
    return t;
  });
}

/** 撤销「删卡组」对一堆 token 的影响：用它做的卡盒按原索引插回。 */
export function restorePileTokens(
  before: Token[],
  current: Token[],
  groupId: string,
): Token[] {
  const currentIds = new Set(current.map((t) => t.id));
  const inserts = before
    .map((t, i) => ({ item: t, index: i }))
    .filter(({ item }) => !currentIds.has(item.id) && item.pile?.group_id === groupId);
  return insertAtIndices(current, inserts);
}

// ───────────────── 足迹采集 ─────────────────

export interface CardFootprint {
  card: Card;
  /** 删除前两侧碰过它的关系边 */
  relations: Relation[];
  /** 删除前成员里有它的卡组 */
  groups: CardGroup[];
  /** 删除前挂着它、或卡盒里有它的棋盘 */
  boards: Board[];
  // 会话不再持有棋子。它通过卡组引用卡，故上面的 groups 已覆盖会话这一路。
}

export interface GroupFootprint {
  group: CardGroup;
  /** 删除前有它做的卡盒的棋盘 */
  boards: Board[];
  /** 删除前拿它当队伍的会话 */
  sessions: Session[];
}

export interface BoardFootprint {
  board: Board;
  // 会话不再绑定棋盘，删棋盘不需要解绑任何东西。
}

/** 删除前采集这张卡的关系网足迹。卡不在 store 里时返回 null。 */
export function captureCardFootprint(cardId: string): CardFootprint | null {
  const s = useProjectStore.getState();
  const card = (s.cards ?? []).find((c) => c.id === cardId);
  if (!card) return null;
  return {
    card,
    relations: (s.relations ?? []).filter(
      (r) => r.from === cardId || r.to === cardId,
    ),
    groups: (s.cardGroups ?? []).filter((g) => g.card_ids.includes(cardId)),
    boards: (s.boards ?? []).filter((b) => tokensTouchCard(b.tokens ?? [], cardId)),
  };
}

/** 删除前采集这个卡组的足迹。 */
export function captureGroupFootprint(groupId: string): GroupFootprint | null {
  const s = useProjectStore.getState();
  const group = (s.cardGroups ?? []).find((g) => g.id === groupId);
  if (!group) return null;
  const hasPile = (tokens: Token[]) =>
    (tokens ?? []).some((t) => t.pile?.group_id === groupId);
  return {
    group,
    boards: (s.boards ?? []).filter((b) => hasPile(b.tokens)),
    sessions: (s.sessions ?? []).filter((x) => x.group_id === groupId),
  };
}

/** 删除前采集这个棋盘的足迹。会话不再绑定棋盘，因此只有本体。 */
export function captureBoardFootprint(boardId: string): BoardFootprint | null {
  const s = useProjectStore.getState();
  const board = (s.boards ?? []).find((b) => b.id === boardId);
  if (!board) return null;
  return { board };
}

// ───────────────── 恢复 ─────────────────

/** 恢复一批卡的足迹。批量删除走这个，只在最后回灌一次 store。 */
export async function restoreCardFootprints(
  footprints: (CardFootprint | null)[],
): Promise<void> {
  for (const fp of footprints) {
    if (fp) await applyCardFootprint(fp);
  }
  await reloadIntoStore();
}

export async function restoreCardFootprint(fp: CardFootprint): Promise<void> {
  await restoreCardFootprints([fp]);
}

async function applyCardFootprint(fp: CardFootprint): Promise<void> {
  const s = useProjectStore.getState();

  // 卡本体。用户没手动重建过才写回
  if (!(s.cards ?? []).some((c) => c.id === fp.card.id)) {
    await ipc.saveCard(fp.card);
  }

  // 关系边：缺的才补，不覆盖用户之后新建的同 id 边
  for (const r of fp.relations) {
    if (!(s.relations ?? []).some((x) => x.id === r.id)) {
      await ipc.upsertRelation(r);
    }
  }

  // 卡组成员身份：插回原位置
  for (const g of fp.groups) {
    const cur = (s.cardGroups ?? []).find((x) => x.id === g.id);
    if (!cur) {
      await ipc.upsertCardGroup(g);
      continue;
    }
    if (cur.card_ids.includes(fp.card.id)) continue;
    const idx = g.card_ids.indexOf(fp.card.id);
    const next = [...cur.card_ids];
    next.splice(clamp(idx, 0, next.length), 0, fp.card.id);
    await ipc.upsertCardGroup({ ...cur, card_ids: next, updated_at: nowMs() });
  }

  for (const b of fp.boards) {
    const cur = (s.boards ?? []).find((x) => x.id === b.id);
    if (!cur) {
      await ipc.upsertBoard(b);
      continue;
    }
    const tokens = restoreTokensForCard(b.tokens ?? [], cur.tokens ?? [], fp.card.id);
    if (!deepEqual(tokens, cur.tokens ?? [])) {
      await ipc.upsertBoard({ ...cur, tokens, updated_at: nowMs() });
    }
  }

  // 会话不再持有棋子。它通过卡组引用卡，上面的卡组成员恢复已覆盖这一路。
}

/** 恢复一批卡组的足迹。 */
export async function restoreGroupFootprints(
  footprints: (GroupFootprint | null)[],
): Promise<void> {
  for (const fp of footprints) {
    if (!fp) continue;
    const s = useProjectStore.getState();
    if (!(s.cardGroups ?? []).some((g) => g.id === fp.group.id)) {
      await ipc.upsertCardGroup(fp.group);
    }
    for (const b of fp.boards) {
      const cur = (s.boards ?? []).find((x) => x.id === b.id);
      if (!cur) {
        await ipc.upsertBoard(b);
        continue;
      }
      const tokens = restorePileTokens(b.tokens ?? [], cur.tokens ?? [], fp.group.id);
      if (!deepEqual(tokens, cur.tokens ?? [])) {
        await ipc.upsertBoard({ ...cur, tokens, updated_at: nowMs() });
      }
    }
    for (const before of fp.sessions) {
      const cur = (s.sessions ?? []).find((x) => x.id === before.id);
      if (!cur) {
        await ipc.upsertSession(before);
        continue;
      }
      // 用户已经选了别的队伍 → 尊重后来的选择
      if (cur.group_id != null) continue;
      await ipc.upsertSession({
        ...cur,
        group_id: before.group_id ?? null,
        updated_at: nowMs(),
      });
    }
  }
  await reloadIntoStore();
}

export async function restoreGroupFootprint(fp: GroupFootprint): Promise<void> {
  await restoreGroupFootprints([fp]);
}

/** 恢复棋盘的足迹。会话不再绑定棋盘，因此只恢复本体。 */
export async function restoreBoardFootprint(fp: BoardFootprint): Promise<void> {
  const s = useProjectStore.getState();
  if (!(s.boards ?? []).some((b) => b.id === fp.board.id)) {
    await ipc.upsertBoard(fp.board);
  }
  await reloadIntoStore();
}
