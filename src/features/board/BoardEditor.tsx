import { useEffect, useState } from "react";
import { ipc, type Board, type GridConfig } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { BoardCanvas } from "./BoardCanvas";

interface Props {
  board: Board;
}

const DEFAULT_GRID: GridConfig = {
  size: 50,
  offset_x: 0,
  offset_y: 0,
  visible: true,
  snap: true,
};

export function BoardEditor({ board }: Props) {
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const setCurrentBoard = useProjectStore((s) => s.setCurrentBoard);

  const normalized: Board = {
    ...board,
    grid: board.grid ?? DEFAULT_GRID,
    tokens: board.tokens ?? [],
  };

  const [name, setName] = useState(normalized.name);

  // 切换棋盘或外部更新名字时同步
  useEffect(() => {
    setName(normalized.name);
  }, [normalized.id, normalized.name]);

  // 挂载时设 currentBoardId，卸载清空
  useEffect(() => {
    setCurrentBoard(normalized.id);
    return () => {
      setCurrentBoard(null);
    };
  }, [normalized.id, setCurrentBoard]);

  // 立即保存：先更新 store（同步），再持久化（异步）
  async function savePatch(patch: Partial<Board>) {
    const next: Board = {
      ...normalized,
      ...patch,
      updated_at: Date.now(),
    };
    try {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  function commitName() {
    if (name !== normalized.name) {
      savePatch({ name });
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
              savePatch({ grid: { ...grid, visible: e.target.checked } })
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
              savePatch({ grid: { ...grid, snap: e.target.checked } })
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
              savePatch({
                grid: { ...grid, size: Number(e.target.value) || 10 },
              })
            }
            style={{ width: 60, padding: "2px 4px" }}
          />
        </label>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <BoardCanvas board={normalized} onChange={savePatch} />
      </div>
    </div>
  );
}
