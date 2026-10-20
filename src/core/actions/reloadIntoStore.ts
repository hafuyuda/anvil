import { ipc } from "../ipc";
import { useProjectStore } from "../../stores/projectStore";

/**
 * 重新从磁盘读入整个项目并灌回 store。
 *
 * 用在「后端连带改了多处数据」之后 —— 比如删一张卡，后端会连带摘掉
 * 棋盘棋子、卡盒、先攻条目、关系两侧与卡组成员。前端如果只删卡片本身，
 * store 与磁盘就不一致了：用户切到棋盘还能看见那个棋子，再拖一下
 * 又把它写回磁盘。
 */
export async function reloadIntoStore(): Promise<void> {
  const snap = await ipc.reloadProject();
  useProjectStore.getState().refreshProject({
    cards: snap.cards,
    cardTypes: snap.card_types,
    relationKinds: snap.relation_kinds,
    relations: snap.relations,
    scenarios: snap.scenarios,
    boards: snap.boards,
    sessions: snap.sessions,
    cardGroups: snap.card_groups,
  });
}
