import { useCallback, useEffect, useState } from "react";
import { ipc, type GameEvent, type EventVisibility } from "../../core/ipc";
import { runWithError } from "../../lib/runWithError";

/**
 * 会话事件（对话记录）的状态与操作。
 * sessionId 变化时重新加载。
 *
 * 追加走「本地 append」：后端把落库的那条（含 seq）返回过来，直接接到
 * 列表末尾。整表重读只在切会话和低频人工操作（编辑 / 删除）时发生 ——
 * 否则每说一句话就是一次全量读 + 全量解析 + 全量 IPC 传输，
 * 长会话里累计成 O(n²)。
 */
export function useSessionEvents(sessionId: string) {
  const [events, setEvents] = useState<GameEvent[]>([]);

  const reload = useCallback(async () => {
    const updated = await ipc.listEvents(sessionId);
    setEvents(updated);
  }, [sessionId]);

  useEffect(() => {
    ipc
      .listEvents(sessionId)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [sessionId]);

  /** 接到列表末尾。seq 已存在就不重复接（防止重入）。 */
  const appendLocal = useCallback((ev: GameEvent) => {
    setEvents((prev) =>
      prev.some((e) => e.seq === ev.seq) ? prev : [...prev, ev],
    );
  }, []);

  const logEvent = useCallback(
    async (
      kind: string,
      payload: unknown,
      note?: string,
      visibility?: EventVisibility,
    ) => {
      await runWithError(async () => {
        const ev = await ipc.appendEvent(
          sessionId,
          kind,
          payload,
          note,
          visibility,
        );
        appendLocal(ev);
      }, "记录事件失败");
    },
    [sessionId, appendLocal],
  );

  const updateEvent = useCallback(
    async (seq: number, payload: unknown, note?: string) => {
      await ipc.updateEvent(sessionId, seq, payload, note);
      await reload();
    },
    [sessionId, reload],
  );

  const deleteEvent = useCallback(
    async (seq: number) => {
      await runWithError(async () => {
        await ipc.deleteEvent(sessionId, seq);
        await reload();
      }, "删除失败");
    },
    [sessionId, reload],
  );

  /**
   * 揭示一条秘密事件。
   * 后端会把本体标 revealed（仍是 secret），并在流尾追加一条公开副本。
   * 前端本地标记 + 追加副本，不整表重读。
   */
  const revealEvent = useCallback(
    async (seq: number) => {
      await runWithError(async () => {
        const copy = await ipc.revealEvent(sessionId, seq);
        setEvents((prev) =>
          prev.map((e) => (e.seq === seq ? { ...e, revealed: true } : e)),
        );
        appendLocal(copy);
      }, "揭示失败");
    },
    [sessionId, appendLocal],
  );

  return { events, logEvent, updateEvent, deleteEvent, revealEvent };
}
