import { useProjectStore } from "../stores/projectStore";

export function StatusBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const pendingSaves = useProjectStore((s) => s.pendingSaves);
  const undoStack = useProjectStore((s) => s.undoStack) ?? [];
  const redoStack = useProjectStore((s) => s.redoStack) ?? [];

  return (
    <div
      style={{
        height: "var(--statusbar-h)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        gap: 16,
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
      <span>
        撤销 <Mono>{undoStack.length}</Mono> / 重做{" "}
        <Mono>{redoStack.length}</Mono>
      </span>
      {pendingSaves > 0 && (
        <span style={{ color: "var(--accent-flame)" }}>
          保存中 <Mono>{pendingSaves}</Mono>
        </span>
      )}
      <div style={{ flex: 1 }} />
      {projectPath && (
        <span style={{ fontFamily: "var(--font-mono)" }}>{projectPath}</span>
      )}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-primary)" }}>
      {children}
    </span>
  );
}