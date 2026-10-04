import { useState } from "react";
import { ipc, type Board } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { BoardEditor } from "./BoardEditor.tsx";

export function BoardList() {
  const boards = useProjectStore((s) => s.boards) ?? [];
  const upsertBoard = useProjectStore((s) => s.upsertBoard);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function addBoard() {
    const now = Date.now();
    const b: Board = {
      id: crypto.randomUUID(),
      name: "新棋盘",
      width: 1200,
      height: 800,
      grid: { size: 50, offset_x: 0, offset_y: 0, visible: true, snap: true },
      background: null,
      tokens: [],
      created_at: now,
      updated_at: now,
    };
    await ipc.upsertBoard(b);
    upsertBoard(b);
    setSelectedId(b.id);
  }

  const selected = boards.find((b) => b.id === selectedId) ?? null;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 180, overflow: "auto" }}>
        <button onClick={addBoard}>新建棋盘</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {boards.map((b) => (
            <li
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              style={{
                cursor: "pointer",
                padding: "4px 0",
                fontWeight: b.id === selectedId ? "bold" : "normal",
              }}
            >
              {b.name}
            </li>
          ))}
        </ul>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {selected ? (
          <BoardEditor key={selected.id} board={selected} />
        ) : (
          <p style={{ color: "#888" }}>选择或新建一个棋盘</p>
        )}
      </div>
    </div>
  );
}