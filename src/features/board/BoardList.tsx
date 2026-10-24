import { useState } from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EntityListLayout } from "../../components/layout/EntityListLayout";
import { BoardEditor } from "./BoardEditor";
import { BoardThumbnail } from "./BoardThumbnail";
import { DEFAULT_GRID } from "./constants";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { runWithError } from "../../lib/runWithError";
import { toast } from "../../lib/toast";
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
    // 落子历史不在 Board 结构里，删棋盘时后端会连 events.jsonl 一起清掉。
    // 撤销要把历史也还回来，所以先抄一份；读不到就当没有，不拦着删除。
    const history = await runWithError(
      () => ipc.listBoardEvents(s.id),
      "读取落子历史失败",
    );
    const events = history.ok ? history.value : [];

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
            // seq 由后端重新分配，先后次序不变
            for (const ev of events) {
              await ipc.appendBoardEvent(
                s.id,
                ev.kind,
                ev.payload,
                ev.note ?? undefined,
              );
            }
          },
        }),
      "删除失败",
    );
  }

  /**
   * 导出单个棋盘：棋盘本体 + 它的落子历史，一个自足的 JSON。
   * 卡牌本体不跟着走 —— 棋盘只持有 card_id 引用。
   */
  async function handleExport(b: Board) {
    const output = await saveDialog({
      defaultPath: `${b.name}.board.json`,
      filters: [{ name: "Anvil 棋盘", extensions: ["json"] }],
      title: "导出棋盘",
    });
    if (!output) return;
    await runWithError(async () => {
      await ipc.exportBoard(b.id, output);
      toast.success(`已导出「${b.name}」`);
    }, "导出失败");
  }

  async function handleImport() {
    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "Anvil 棋盘", extensions: ["json"] }],
      title: "导入棋盘",
    });
    if (!picked || Array.isArray(picked)) return;
    await runWithError(async () => {
      const board = await ipc.importBoard(picked);
      upsertBoard(board);
      setSelectedId(board.id);
      toast.success(`已导入「${board.name}」`);
    }, "导入失败");
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
      listWidth={220}
      renderItem={(b) => (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <BoardThumbnail board={b} />
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {b.name}
          </span>
        </span>
      )}
      listControls={
        <button
          className="btn"
          onClick={() => void handleImport()}
          style={{ fontSize: 12 }}
          title="从 JSON 文件导入一个棋盘（含落子历史）"
        >
          导入棋盘…
        </button>
      }
      itemActions={(b) => (
        <button
          className="btn btn-ghost"
          onClick={() => void handleExport(b)}
          title="导出这个棋盘（含落子历史）"
          style={{ padding: "1px 6px", fontSize: 11 }}
        >
          导出
        </button>
      )}
      renderEditor={(b) => <BoardEditor key={b.id} board={b} />}
      emptyHint="选择或新建一个棋盘"
    />
  );
}
