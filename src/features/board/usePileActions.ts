import type { Token } from "../../core/ipc";
import { newId } from "../../lib/id";

interface Args {
  /** 当前所有 token，用于读取 pile 状态、计算新布局 */
  tokens: Token[];
  /**
   * 应用新的 token 列表。调用方负责落盘 + 更新 store + 记撤销栈。
   * label 会展示在撤销按钮上。
   */
  applyTokens: (next: Token[], label: string) => Promise<void>;
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
  async function drawFromPile(pileTokenId: string, count: number) {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return;

    const remaining = [...pileToken.pile.remaining];
    const drawn: string[] = [];
    for (let i = 0; i < count && remaining.length > 0; i++) {
      drawn.push(remaining.shift()!);
    }
    if (drawn.length === 0) return;

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

    await applyTokens(next, `抽 ${drawn.length} 张牌`);
  }

  async function shufflePile(pileTokenId: string) {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return;

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
    await applyTokens(next, "洗牌");
  }

  async function resetPile(pileTokenId: string) {
    const pileToken = tokens.find((t) => t.id === pileTokenId);
    if (!pileToken?.pile) return;

    const updatedPile: Token = {
      ...pileToken,
      pile: { ...pileToken.pile, remaining: [...pileToken.pile.initial] },
    };

    const next = tokens.map((t) => (t.id === pileTokenId ? updatedPile : t));
    await applyTokens(next, "重置卡盒");
  }

  return { drawFromPile, shufflePile, resetPile };
}
