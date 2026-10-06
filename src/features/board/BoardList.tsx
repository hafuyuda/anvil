import { useState } from "react";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/EntityListLayout";
import { BoardEditor } from "./BoardEditor";
import { DEFAULT_GRID } from "./constants";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";

export function BoardList() {
  const boards = useProjectStore((s) => s.boards) ?? [];
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const removeBoard = useProjectStore((s) => s.removeBoard);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addBoard() {
    const now = nowMs();
    const b: Board = {
      id: newId(),
      name: "新棋盘",
      width: 1200,
      height: 800,
      grid: { ...DEFAULT_GRID },
      background: null,
      tokens: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertBoard(b);
    upsertBoard(b);
    setSelectedId(b.id);
  }

  const deleteWithUndo = useDeleteUndo();

  async function handleDelete(s: Board) {
    if (!confirm(`删除「${s.name}」？可用 Ctrl+Z 撤销。`)) return;
    try {
      await deleteWithUndo({
        label: "删除棋盘",
        do: async () => {
          await ipc.deleteBoard(s.id);
          removeBoard(s.id);
          if (selectedId === s.id) setSelectedId(null);
        },
        restore: async () => {
          await ipc.upsertBoard(s);
          upsertBoard(s);
        },
      });
    } catch (e) {
      alert("删除失败: " + e);
    }
  }

  return (
    <EntityListLayout
      listLabel="棋盘"
      items={boards}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={addBoard}
      onDelete={handleDelete}
      createLabel="+ 新建棋盘"
      renderItem={(b) => b.name}
      renderEditor={(b) => <BoardEditor key={b.id} board={b} />}
      emptyHint="选择或新建一个棋盘"
    />
  );
}
