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
}

/**
 * 卡盒操作：抽牌 / 洗牌 / 重置。
 * Board 和 Session 共用，差异由调用方的 applyTokens 承担。
 */
export function usePileActions({ tokens, applyTokens }: Args) {
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

    const newTokens: Token[] = drawn.map((cardId, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      return {
        id: newId(),
        card_id: cardId,
        name_override: null,
        value_overrides: {},
        x: pileToken.x + (col + 1) * 160,
        y: pileToken.y + row * 220,
        w: 140,
        h: 205,
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
