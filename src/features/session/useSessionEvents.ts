import { useCallback, useEffect, useState } from "react";
import { ipc, type GameEvent } from "../../core/ipc";
import { runWithError } from "../../lib/runWithError";

/**
 * 会话事件（对话记录）的状态与操作。
 * sessionId 变化时重新加载。
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

  async function logEvent(kind: string, payload: unknown, note?: string) {
    await runWithError(async () => {
      await ipc.appendEvent(sessionId, kind, payload, note);
      await reload();
    }, "记录事件失败");
  }

  async function updateEvent(seq: number, payload: unknown, note?: string) {
    await ipc.updateEvent(sessionId, seq, payload, note);
    await reload();
  }

  async function deleteEvent(seq: number) {
    await runWithError(async () => {
      await ipc.deleteEvent(sessionId, seq);
      await reload();
    }, "删除失败");
  }

  return { events, logEvent, updateEvent, deleteEvent };
}
