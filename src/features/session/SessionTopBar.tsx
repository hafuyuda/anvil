import type { Board, Session } from "../../core/ipc";
import { SaveInput } from "../../components/ui/SaveInput";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  session: Session;
  boards: Board[];
  onRename: (name: string) => void;
  onSelectBoard: (boardId: string) => void;
}

export function SessionTopBar({
  session,
  boards,
  onRename,
  onSelectBoard,
}: Props) {
  const setActiveModule = useProjectStore((s) => s.setActiveModule);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}
    >
      <SaveInput
        value={session.name}
        onCommit={onRename}
        style={{
          width: 240,
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-title)",
        }}
      />

      <div style={{ flex: 1 }} />

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
        }}
      >
        战场棋盘
        <select
          className="select"
          value={session.board_id ?? ""}
          onChange={(e) => onSelectBoard(e.target.value)}
          style={{ minWidth: 140, width: "auto" }}
        >
          <option value="">— 无 —</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn"
        onClick={() => setActiveModule("player")}
        title="打开 BGM 播放器 (Ctrl+M)"
        style={{ fontSize: 12 }}
      >
        🎵 BGM
      </button>
    </div>
  );
}
