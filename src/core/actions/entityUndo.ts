import {
  ipc,
  type Board,
  type Card,
  type CardGroup,
  type InitiativeEntry,
  type InitiativeTracker,
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
  out.splice(Math.min(Math.max(idx, 0), out.length), 0, cardId);
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

/** 撤销「删卡」对先攻列表的影响：被移走的条目按原索引插回。 */
export function restoreEntriesForCard(
  before: InitiativeEntry[],
  current: InitiativeEntry[],
  cardId: string,
): InitiativeEntry[] {
  const inserts = before
    .map((e, i) => ({ item: e, index: i }))
    .filter(
      ({ item }) =>
        item.card_id === cardId &&
        !current.some((c) => deepEqual(c, item)),
    );
  return insertAtIndices(current, inserts);
}

/** 撤销「删卡」对先攻追踪器的影响。没被这次删除碰过就原样返回。 */
export function restoreTrackerForCard(
  before: InitiativeTracker | null | undefined,
  current: InitiativeTracker | null | undefined,
  cardId: string,
): InitiativeTracker | null | undefined {
  if (!before) return current;
  const beforeEntries = before.entries ?? [];
  if (!beforeEntries.some((e) => e.card_id === cardId)) return current;
  if (!current) return before;

  const entries = restoreEntriesForCard(beforeEntries, current.entries ?? [], cardId);
  if (deepEqual(entries, current.entries ?? [])) return current;

  // 后端在移走条目后会把 turn_index 夹到合法范围。撤销时若当前值正好等于
  // 那个夹出来的结果，说明用户没再动过先攻，直接还原动作前的下标；
  // 否则用户之后推进过轮次，保留他的。
  const clamped =
    current.entries.length > 0
      ? Math.min(before.turn_index, current.entries.length - 1)
      : 0;

  return {
    ...current,
    entries,
    turn_index:
      current.turn_index === clamped ? before.turn_index : current.turn_index,
    // 后端在条目清空时会把 active 置 false，插回非空时还原
    active: current.active || (before.active && entries.length > 0),
  };
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
  /** 删除前挂着它、卡盒里有它、或先攻里有它的会话 */
  sessions: Session[];
}

export interface GroupFootprint {
  group: CardGroup;
  /** 删除前有它做的卡盒的棋盘 */
  boards: Board[];
  /** 删除前有它做的卡盒的会话 */
  sessions: Session[];
}

export interface BoardFootprint {
  board: Board;
  /** 删除前拿它作战场的会话 */
  sessions: Session[];
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
    sessions: (s.sessions ?? []).filter(
      (x) =>
        tokensTouchCard(x.tokens ?? [], cardId) ||
        (x.tracker?.entries ?? []).some((e) => e.card_id === cardId),
    ),
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
    sessions: (s.sessions ?? []).filter((x) => hasPile(x.tokens)),
  };
}

/** 删除前采集这个棋盘的足迹（主要是被解绑的会话）。 */
export function captureBoardFootprint(boardId: string): BoardFootprint | null {
  const s = useProjectStore.getState();
  const board = (s.boards ?? []).find((b) => b.id === boardId);
  if (!board) return null;
  return {
    board,
    sessions: (s.sessions ?? []).filter((x) => x.board_id === boardId),
  };
}

// ───────────────── 恢复 ─────────────────

function sameTokens(a: Token[], b: Token[]): boolean {
  return deepEqual(a, b);
}

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
    next.splice(Math.min(Math.max(idx, 0), next.length), 0, fp.card.id);
    await ipc.upsertCardGroup({ ...cur, card_ids: next, updated_at: nowMs() });
  }

  for (const b of fp.boards) {
    const cur = (s.boards ?? []).find((x) => x.id === b.id);
    if (!cur) {
      await ipc.upsertBoard(b);
      continue;
    }
    const tokens = restoreTokensForCard(b.tokens ?? [], cur.tokens ?? [], fp.card.id);
    if (!sameTokens(tokens, cur.tokens ?? [])) {
      await ipc.upsertBoard({ ...cur, tokens, updated_at: nowMs() });
    }
  }

  for (const x of fp.sessions) {
    const cur = (s.sessions ?? []).find((y) => y.id === x.id);
    if (!cur) {
      await ipc.upsertSession(x);
      continue;
    }
    const tokens = restoreTokensForCard(x.tokens ?? [], cur.tokens ?? [], fp.card.id);
    const tracker = restoreTrackerForCard(x.tracker, cur.tracker, fp.card.id);
    if (!sameTokens(tokens, cur.tokens ?? []) || tracker !== cur.tracker) {
      await ipc.upsertSession({ ...cur, tokens, tracker, updated_at: nowMs() });
    }
  }
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
      if (!sameTokens(tokens, cur.tokens ?? [])) {
        await ipc.upsertBoard({ ...cur, tokens, updated_at: nowMs() });
      }
    }
    for (const x of fp.sessions) {
      const cur = (s.sessions ?? []).find((y) => y.id === x.id);
      if (!cur) {
        await ipc.upsertSession(x);
        continue;
      }
      const tokens = restorePileTokens(x.tokens ?? [], cur.tokens ?? [], fp.group.id);
      if (!sameTokens(tokens, cur.tokens ?? [])) {
        await ipc.upsertSession({ ...cur, tokens, updated_at: nowMs() });
      }
    }
  }
  await reloadIntoStore();
}

export async function restoreGroupFootprint(fp: GroupFootprint): Promise<void> {
  await restoreGroupFootprints([fp]);
}

/** 恢复棋盘的足迹：本体 + 被解绑会话的 board_id。 */
export async function restoreBoardFootprint(fp: BoardFootprint): Promise<void> {
  const s = useProjectStore.getState();
  if (!(s.boards ?? []).some((b) => b.id === fp.board.id)) {
    await ipc.upsertBoard(fp.board);
  }
  for (const before of fp.sessions) {
    const cur = (s.sessions ?? []).find((x) => x.id === before.id);
    if (!cur) {
      await ipc.upsertSession(before);
      continue;
    }
    // 用户已经绑了别的棋盘 → 尊重后来的选择
    if (cur.board_id != null) continue;
    if (cur.board_id === before.board_id) continue;
    await ipc.upsertSession({
      ...cur,
      board_id: before.board_id ?? null,
      updated_at: nowMs(),
    });
  }
  await reloadIntoStore();
}
