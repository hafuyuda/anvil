import { useCallback, useEffect, useState } from "react";
import { ipc, type GameEvent } from "../../core/ipc";
import { runWithError } from "../../lib/runWithError";

/**
 * 落子历史（牌谱）的状态与操作。
 *
 * 与 useSessionEvents 同构，只是挂在棋盘上：
 * 追加走「本地 append」——后端把落库那条（含 seq）返回过来直接接到末尾，
 * 不为一句话重读全表。
 *
 * 棋盘事件是「记录发生了什么」用的，不参与撤销：
 * 撤销回滚棋盘状态，牌谱里那一条仍然是「当初确实这么走过」。
 */
export function useBoardEvents(boardId: string) {
  const [events, setEvents] = useState<GameEvent[]>([]);

  const reload = useCallback(async () => {
    const updated = await ipc.listBoardEvents(boardId);
    setEvents(updated);
  }, [boardId]);

  useEffect(() => {
    ipc
      .listBoardEvents(boardId)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [boardId]);

  /** 接到列表末尾。seq 已存在就不重复接（防止重入）。 */
  const appendLocal = useCallback((ev: GameEvent) => {
    setEvents((prev) =>
      prev.some((e) => e.seq === ev.seq) ? prev : [...prev, ev],
    );
  }, []);

  const logEvent = useCallback(
    async (kind: string, payload: unknown, note?: string) => {
      await runWithError(async () => {
        const ev = await ipc.appendBoardEvent(boardId, kind, payload, note);
        appendLocal(ev);
      }, "记录棋盘事件失败");
    },
    [boardId, appendLocal],
  );

  const deleteEvent = useCallback(
    async (seq: number) => {
      await runWithError(async () => {
        await ipc.deleteBoardEvent(boardId, seq);
        await reload();
      }, "删除失败");
    },
    [boardId, reload],
  );

  return { events, logEvent, deleteEvent, reload };
}
