import { useProjectStore } from "../stores/projectStore";

export function StatusBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const cards = useProjectStore((s) => s.cards);
  const cardTypes = useProjectStore((s) => s.cardTypes);

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
      <span>索引 未启用</span>
      <div style={{ flex: 1 }} />
      {projectPath && <span>{projectPath}</span>}
    </div>
  );
}