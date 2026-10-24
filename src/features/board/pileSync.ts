import type { PileData } from "../../core/ipc";

/**
 * 卡组 → 卡盒 的「只补不删」同步（设计见 DESIGN §4.7 / §13；原 §24 P2 待办已迁出至 `docs/ROADMAP.md`）。
 *
 * 语义：卡盒是它所属卡组的一面**活窗口**——组里新增的卡按组顺序补进
 * `initial`（牌堆定义）与 `remaining`（当前余量），已抽走的牌不影响。
 * 组里被移除的卡**不动**：棋盘上的删除只能是用户的显式动作，
 * 与 §4.9「不静默级联」同一条线。
 *
 * 多重集语义：组里某张卡有 N 份、卡盒只有 M 份（M<N）时补 N-M 份 ——
 * 同名的多份引用不会被 Set 去重吞掉（「按类型生成」+「多份引用」
 * 两套机制叠加时真会出现）。
 *
 * 纯函数：不碰 store / IPC，调用方负责落盘、记撤销与牌谱。
 */
export function syncPileWithGroup(
  pile: PileData,
  groupCardIds: string[],
): { pile: PileData; added: string[] } {
  const need = new Map<string, number>();
  for (const id of groupCardIds) need.set(id, (need.get(id) ?? 0) + 1);
  const have = new Map<string, number>();
  for (const id of pile.initial) have.set(id, (have.get(id) ?? 0) + 1);

  // Map 迭代序 = 该 id 在组里首次出现的顺序，即组顺序
  const added: string[] = [];
  for (const [id, n] of need) {
    const missing = n - (have.get(id) ?? 0);
    for (let i = 0; i < missing; i++) added.push(id);
  }
  if (added.length === 0) return { pile, added };

  const initial = [...pile.initial, ...added];
  return {
    pile: {
      ...pile,
      initial,
      // 补的牌进 remaining 尾部：抽牌进程（remaining 已短于 initial）
      // 不受影响，徽章 N/M 的 M 随 initial 增长
      remaining: [...pile.remaining, ...added],
      total: initial.length,
    },
    added,
  };
}
