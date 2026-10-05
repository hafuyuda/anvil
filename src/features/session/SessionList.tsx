import { useState } from "react";
import { ipc, type Session } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { SessionEditor } from "./SessionEditor";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

export function SessionList() {
  const sessions = useProjectStore((s) => s.sessions) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const removeSession = useProjectStore((s) => s.removeSession);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addSession() {
    const now = nowMs();
    const s: Session = {
      id: newId(),
      name: "新会话",
      board_id: null,
      state: {},
      tokens: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertSession(s);
    upsertSession(s);
    setSelectedId(s.id);
  }

  async function handleDelete(s: Session) {
    if (!confirm(`删除会话「${s.name}」？对话记录会一并删除。`)) return;
    try {
      await ipc.deleteSession(s.id);
      removeSession(s.id);
      if (selectedId === s.id) setSelectedId(null);
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="会话"
      items={sessions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addSession}
      onDelete={handleDelete}
      createLabel="+ 新建会话"
      renderItem={(s) => s.name}
      renderEditor={(s) => <SessionEditor key={s.id} session={s} />}
      emptyHint="选择或新建一个会话"
    />
  );
}
