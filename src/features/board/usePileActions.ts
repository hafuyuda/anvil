import type { PileData, Token } from "../../core/ipc";
import { newId } from "../../lib/id";
import { syncPileWithGroup } from "./pileSync";

/**
 * 卡盒动作的语义标签，随 `applyTokens` 传给调用方（记撤销栈用）。
 *
 * 注：早年会话也用本 hook 写牌谱，0.4.x 棋盘从会话剥离后（DESIGN §14.1）
 * 只剩棋盘一个消费者。
 */
export type PileActionKind = "draw" | "shuffle" | "reset" | "sync";

/**
 * 卡盒动作的结果。
 *
 * 为什么要把它们返回出来：牌谱要记 delta（抽出了哪些牌、落到哪、卡盒剩什么），
 * 而这些值是在本文件里算出来的 —— 调用方拿不到就只能重算一遍，
 * 两处一旦不一致，回放就会静默错位。所以算完直接递出去。
 */
export interface PileResult {
  /** 抽牌时新增到棋盘上的 token（含落位坐标） */
  placed?: Token[];
  /** 动作之后卡盒的剩余牌面 */
  pileAfter?: PileData;
}

export interface PileAction {
  kind: PileActionKind;
  pile_token_id: string;
}

interface Args {
  /** 当前所有 token，用于读取 pile 状态、计算新布局 */
  tokens: Token[];
  /**
   * 应用新的 token 列表。调用方负责落盘 + 更新 store + 记撤销栈。
   * label 会展示在撤销按钮上，action 说明这次是什么卡盒动作。
   */
  applyTokens: (next: Token[], label: string, action?: PileAction) => Promise<void>;
  /** 棋盘尺寸。省略则不检查边界 */
  bounds?: { width: number; height: number };
}

const TOKEN_W = 140;
const TOKEN_H = 205;
const GAP_X = 160;
const GAP_Y = 220;

/**
 * 从卡盒位置开始找放置点。
 * 优先右侧 → 下方 → 上方 → 左侧。都不行则堆在卡盒原位。
 */
function findPlacement(
  pileToken: Token,
  idx: number,
  occupied: { x: number; y: number }[],
  bounds: { width: number; height: number } | undefined,
): { x: number; y: number } {
  const dirs: { dx: number; dy: number }[] = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
  ];

  for (const { dx, dy } of dirs) {
    // 沿这个方向找，最多试 20 步
    for (let step = 1; step <= 20; step++) {
      const x = pileToken.x + dx * step * GAP_X;
      const y = pileToken.y + dy * step * GAP_Y;

      if (bounds) {
        if (x < 0 || y < 0) continue;
        if (x + TOKEN_W > bounds.width) continue;
        if (y + TOKEN_H > bounds.height) continue;
      }

      const blocked = occupied.some(
        (p) =>
          Math.abs(p.x - x) < TOKEN_W * 0.6 &&
          Math.abs(p.y - y) < TOKEN_H * 0.6,
      );
      if (blocked) continue;

      return { x, y };
    }
  }

  // 全满，堆在卡盒原位（稍微错位，避免完全重合）
  return {
    x: pileToken.x + (idx % 4) * 8,
    y: pileToken.y + (idx % 4) * 8,
  };
}

/**
 * 卡盒操作：抽牌 / 洗牌 / 重置。
 * Board 和 Session 共用，差异由调用方的 applyTokens 承担。
 */
export function usePileActions({ tokens, applyTokens, bounds }: Args) {
  async function drawFromPile(
    pileTokenId: string,
    count: number,
  ): Promise<PileResult | null> {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return null;

    const remaining = [...pileToken.pile.remaining];
    const drawn: string[] = [];
    for (let i = 0; i < count && remaining.length > 0; i++) {
      drawn.push(remaining.shift()!);
    }
    if (drawn.length === 0) return null;

    const startLayer = tokens.reduce((m, t) => Math.max(m, t.layer), 0) + 1;

    // 已占用的位置（用于避让）
    const occupied = tokens.map((t) => ({ x: t.x, y: t.y }));

    const newTokens: Token[] = drawn.map((cardId, i) => {
      const pos = findPlacement(pileToken, i, occupied, bounds);
      occupied.push(pos); // 后续的牌避让新加的
      return {
        id: newId(),
        card_id: cardId,
        name_override: null,
        value_overrides: {},
        x: pos.x,
        y: pos.y,
        w: TOKEN_W,
        h: TOKEN_H,
        rotation: 0,
        layer: startLayer + i,
        visible: true,
        face_down: true,
        pile: null,
      };
    });

    const updatedPile: Token = {
      ...pileToken,
      pile: { ...pileToken.pile, remaining },
    };

    const next = [
      ...tokens.map((t) => (t.id === pileTokenId ? updatedPile : t)),
      ...newTokens,
    ];

    await applyTokens(next, `抽 ${drawn.length} 张牌`, {
      kind: "draw",
      pile_token_id: pileTokenId,
    });
    return { placed: newTokens, pileAfter: updatedPile.pile ?? undefined };
  }

  async function shufflePile(pileTokenId: string): Promise<PileResult | null> {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return null;

    const remaining = [...pileToken.pile.remaining];
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const updatedPile: Token = {
      ...pileToken,
      pile: { ...pileToken.pile, remaining },
    };

    const next = tokens.map((t) => (t.id === pileTokenId ? updatedPile : t));
    await applyTokens(next, "洗牌", {
      kind: "shuffle",
      pile_token_id: pileTokenId,
    });
    return { pileAfter: updatedPile.pile ?? undefined };
  }

  async function resetPile(pileTokenId: string): Promise<PileResult | null> {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return null;

    const updatedPile: Token = {
      ...pileToken,
      pile: { ...pileToken.pile, remaining: [...pileToken.pile.initial] },
    };

    const next = tokens.map((t) => (t.id === pileTokenId ? updatedPile : t));
    await applyTokens(next, "重置卡盒", {
      kind: "reset",
      pile_token_id: pileTokenId,
    });
    return { pileAfter: updatedPile.pile ?? undefined };
  }

  /**
   * 卡组 → 卡盒同步（只补不删）。返回补入的卡 id，
   * 调用方据此记牌谱；为空表示组里没有新卡，什么都不写。
   */
  async function syncPile(
    pileTokenId: string,
    groupCardIds: string[],
  ): Promise<{ added: string[] } & PileResult> {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return { added: [] };

    const { pile, added } = syncPileWithGroup(pileToken.pile, groupCardIds);
    if (added.length === 0) return { added };

    const next = tokens.map((t) =>
      t.id === pileTokenId ? { ...t, pile } : t,
    );
    await applyTokens(next, `同步卡组 +${added.length} 张`, {
      kind: "sync",
      pile_token_id: pileTokenId,
    });
    return { added, pileAfter: pile };
  }

  return { drawFromPile, shufflePile, resetPile, syncPile };
}
