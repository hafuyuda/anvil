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

  return (
    <EntityListLayout
      listLabel="会话"
      items={sessions}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addSession}
      createLabel="+ 新建会话"
      renderItem={(s) => s.name}
      renderEditor={(s) => <SessionEditor key={s.id} session={s} />}
      emptyHint="选择或新建一个会话"
    />
  );
}