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
        height: 24,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        borderTop: "1px solid #e0e0e0",
        background: "#fafafa",
        gap: 16,
        fontSize: 11,
        color: "#888",
      }}
    >
      <span>卡牌 {cards.length}</span>
      <span>类型 {cardTypes.length}</span>
      <span>索引 已启用</span>
      <span>
        撤销 {undoStack.length} / 重做 {redoStack.length}
      </span>
      {pendingSaves > 0 && (
        <span style={{ color: "#c80" }}>保存中 {pendingSaves}</span>
      )}
      <div style={{ flex: 1 }} />
      {projectPath && <span>{projectPath}</span>}
    </div>
  );
}