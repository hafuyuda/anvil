import { useMemo, useState } from "react";
import { ipc, type Session } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { SessionEditor } from "./SessionEditor";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";

type SortKey = "updated_desc" | "updated_asc" | "created_desc" | "name";

export function SessionList() {
  const sessions = useProjectStore((s) => s.sessions) ?? [];
  const upsertSession = useProjectStore((s) => s.upsertSession);
  const removeSession = useProjectStore((s) => s.removeSession);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  const sorted = useMemo(() => {
    const list = [...sessions];
    switch (sortKey) {
      case "updated_desc":
        return list.sort((a, b) => b.updated_at - a.updated_at);
      case "updated_asc":
        return list.sort((a, b) => a.updated_at - b.updated_at);
      case "created_desc":
        return list.sort((a, b) => b.created_at - a.created_at);
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [sessions, sortKey]);

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

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete(s: Session) {
    if (
      !(await confirmDialog({
        message: `删除「${s.name}」？可用 Ctrl+Z 撤销。`,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    try {
      await deleteWithUndo({
        label: "删除会话",
        do: async () => {
          await ipc.deleteSession(s.id);
          removeSession(s.id);
          if (selectedId === s.id) setSelectedId(null);
        },
        restore: async () => {
          await ipc.upsertSession(s);
          upsertSession(s);
        },
      });
    } catch (e) {
      toast.error("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="会话"
      items={sorted}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addSession}
      onDelete={handleDelete}
      createLabel="+ 新建会话"
      listControls={
        <select
          className="select"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{ fontSize: 11, padding: "2px 6px" }}
        >
          <option value="updated_desc">最近更新</option>
          <option value="updated_asc">最早更新</option>
          <option value="created_desc">最新创建</option>
          <option value="name">按名称</option>
        </select>
      }
      renderItem={(s) => s.name}
      renderEditor={(s) => <SessionEditor key={s.id} session={s} />}
      emptyHint="选择或新建一个会话"
    />
  );
}
