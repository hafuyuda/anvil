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
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          style={{
            flex: 1,
            minWidth: 160,
            fontWeight: 600,
            fontSize: 14,
            fontFamily: "var(--font-title)",
          }}
        />

        <Toggle
          label="显示网格"
          checked={grid.visible}
          onChange={(v) =>
            savePatch({ grid: { ...grid, visible: v } }, "切换网格")
          }
        />
        <Toggle
          label="吸附"
          checked={grid.snap}
          onChange={(v) =>
            savePatch({ grid: { ...grid, snap: v } }, "切换吸附")
          }
        />

        <label
          style={{
            fontSize: 12,
            display: "flex",
            gap: 6,
            alignItems: "center",
            color: "var(--fg-secondary)",
          }}
        >
          格大小
          <input
            className="input"
            type="number"
            value={grid.size}
            onChange={(e) =>
              savePatch(
                { grid: { ...grid, size: Number(e.target.value) || 10 } },
                "修改格大小",
              )
            }
            style={{ width: 64 }}
          />
        </label>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "var(--bg-app)",
        }}
      >
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        fontSize: 12,
        display: "flex",
        gap: 4,
        alignItems: "center",
        color: "var(--fg-secondary)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "var(--accent-gold)" }}
      />
      {label}
    </label>
  );
}
