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
    <div
      style={{
        height: "var(--statusbar-h)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        gap: 12,
        fontSize: 11,
        color: "var(--fg-muted)",
        flexShrink: 0,
      }}
    >
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
            onClick={() => void undo()}
            disabled={undoStack.length === 0}
            title="撤销 Ctrl+Z"
            style={iconBtnStyle(undoStack.length === 0)}
          >
            ↶ <Mono>{undoStack.length}</Mono>
          </button>
          <button
            onClick={() => void redo()}
            disabled={redoStack.length === 0}
            title="重做 Ctrl+Shift+Z"
            style={iconBtnStyle(redoStack.length === 0)}
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

      <div style={{ flex: 1 }} />
      {projectPath && (
        <span style={{ fontFamily: "var(--font-mono)" }}>{projectPath}</span>
      )}
    </div>
  );
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 6px",
    border: "none",
    background: "transparent",
    color: disabled ? "var(--fg-muted)" : "var(--fg-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    opacity: disabled ? 0.5 : 1,
  };
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
