import { useState } from "react";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/layout/EntityListLayout";
import { BoardEditor } from "./BoardEditor";
import { DEFAULT_GRID } from "./constants";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { runWithError } from "../../lib/runWithError";
import { confirmRefAwareDelete } from "../../lib/refAwareDelete";
import { reloadIntoStore } from "../../core/actions/reloadIntoStore";
import {
  captureBoardFootprint,
  restoreBoardFootprint,
} from "../../core/actions/entityUndo";

export function BoardList() {
  const boards = useProjectStore((s) => s.boards) ?? [];
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
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
    const clearMode = await confirmRefAwareDelete([
      { kind: "board", id: s.id, name: s.name },
    ]);
    if (!clearMode) return;
    // 后端会解绑拿它作战场的会话，撤销时要把绑定关系还回去
    const footprint = captureBoardFootprint(s.id);
    await runWithError(
      () =>
        deleteWithUndo({
          label: "删除棋盘",
          do: async () => {
            await ipc.deleteBoard(s.id);
            if (selectedId === s.id) setSelectedId(null);
            // 后端顺手解绑了拿它作战场的会话，store 要整体跟上
            await reloadIntoStore();
          },
          restore: async () => {
            if (footprint) await restoreBoardFootprint(footprint);
          },
        }),
      "删除失败",
    );
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
