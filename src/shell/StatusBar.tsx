import { useProjectStore } from "../stores/projectStore";

export function StatusBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const pendingSaves = useProjectStore((s) => s.pendingSaves);
  const undoStack = useProjectStore((s) => s.undoStack) ?? [];
  const redoStack = useProjectStore((s) => s.redoStack) ?? [];
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

  return (
    <div className="statusbar">
      <span>
        卡牌 <Mono>{cards.length}</Mono>
      </span>
      <span>
        类型 <Mono>{cardTypes.length}</Mono>
      </span>

      {projectPath && (
        <>
          <Sep />
          <button
            className="status-action"
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            title="撤销 Ctrl+Z"
          >
            ↶ <Mono>{undoStack.length}</Mono>
          </button>
          <button
            className="status-action"
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            title="重做 Ctrl+Shift+Z"
          >
            ↷ <Mono>{redoStack.length}</Mono>
          </button>

          <Sep />

          <span
            style={{
              color:
                pendingSaves > 0 ? "var(--accent-flame)" : "var(--fg-muted)",
            }}
          >
            {pendingSaves > 0 ? `保存中… (${pendingSaves})` : "已保存"}
          </span>
        </>
      )}

      <div className="grow" />
      {projectPath && (
        <span className="truncate mono">
          {projectPath}
        </span>
      )}
    </div>
  );
}

function Sep() {
  return <span style={{ color: "var(--border-default)" }}>·</span>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ fontFamily: "var(--font-mono)", color: "var(--fg-primary)" }}
    >
      {children}
    </span>
  );
}
