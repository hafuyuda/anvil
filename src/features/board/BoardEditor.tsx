import { useEffect, useState } from "react";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { BoardCanvas } from "./BoardCanvas";
import { DEFAULT_GRID } from "./constants";
import { nowMs } from "../../lib/time";

interface Props {
  board: Board;
}

export function BoardEditor({ board }: Props) {
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const setCurrentBoard = useProjectStore((s) => s.setCurrentBoard);
  const selectedTokenId = useProjectStore((s) => s.selectedTokenId);
  const selectToken = useProjectStore((s) => s.selectToken);
  const pushUndo = useProjectStore((s) => s.pushUndo);

  const normalized: Board = {
    ...board,
    grid: board.grid ?? DEFAULT_GRID,
    tokens: board.tokens ?? [],
  };

  const [name, setName] = useState(normalized.name);

  useEffect(() => {
    setName(normalized.name);
  }, [normalized.id, normalized.name]);

  useEffect(() => {
    setCurrentBoard(normalized.id);
    return () => {
      setCurrentBoard(null);
    };
  }, [normalized.id, setCurrentBoard]);

  async function persist(b: Board) {
    await ipc.upsertBoard(b);
    upsertBoard(b);
  }

  async function savePatch(patch: Partial<Board>, undoLabel?: string) {
    const before = normalized;
    const after: Board = {
      ...before,
      ...patch,
      updated_at: nowMs(),
    };

    try {
      await ipc.upsertBoard(after);
      upsertBoard(after);

      if (undoLabel) {
        pushUndo({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: undoLabel,
          undo: async () => {
            await persist(before);
          },
          redo: async () => {
            await persist(after);
          },
        });
      }
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  function commitName() {
    if (name !== normalized.name) {
      savePatch({ name }, "重命名棋盘");
    }
  }

  const grid = normalized.grid;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          paddingBottom: 8,
          borderBottom: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          style={{
            padding: "4px 8px",
            fontSize: 14,
            fontWeight: 600,
            flex: 1,
          }}
        />
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={grid.visible}
            onChange={(e) =>
              savePatch(
                { grid: { ...grid, visible: e.target.checked } },
                "切换网格",
              )
            }
          />
          显示网格
        </label>
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={grid.snap}
            onChange={(e) =>
              savePatch(
                { grid: { ...grid, snap: e.target.checked } },
                "切换吸附",
              )
            }
          />
          吸附
        </label>
        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          格大小
          <input
            type="number"
            value={grid.size}
            onChange={(e) =>
              savePatch(
                { grid: { ...grid, size: Number(e.target.value) || 10 } },
                "修改格大小",
              )
            }
            style={{ width: 60, padding: "2px 4px" }}
          />
        </label>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <BoardCanvas
          width={normalized.width}
          height={normalized.height}
          grid={grid}
          tokens={normalized.tokens}
          onTokensChange={(tokens) => savePatch({ tokens }, "移动 Token")}
          selectedTokenId={selectedTokenId}
          onSelectToken={selectToken}
        />
      </div>
    </div>
  );
}
