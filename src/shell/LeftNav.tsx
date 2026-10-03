import { useProjectStore, type ModuleKey } from "../stores/projectStore";

const modules: { key: ModuleKey; label: string }[] = [
  { key: "world", label: "世界观" },
  { key: "types", label: "类型" },
];

export function LeftNav() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const cards = useProjectStore((s) => s.cards);
  const cardTypes = useProjectStore((s) => s.cardTypes);

  return (
    <div
      style={{
        width: 200,
        borderRight: "1px solid #e0e0e0",
        background: "#f7f7f7",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 13,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#999",
          textTransform: "uppercase",
          padding: "4px 8px",
        }}
      >
        模块
      </div>
      {modules.map((m) => (
        <button
          key={m.key}
          onClick={() => setActiveModule(m.key)}
          disabled={!projectPath}
          style={{
            textAlign: "left",
            padding: "6px 10px",
            border: "none",
            borderRadius: 4,
            background: activeModule === m.key ? "#e0e0e0" : "transparent",
            cursor: projectPath ? "pointer" : "not-allowed",
            fontWeight: activeModule === m.key ? 600 : 400,
          }}
        >
          {m.label}
        </button>
      ))}

      <div
        style={{
          marginTop: 16,
          fontSize: 11,
          color: "#999",
          textTransform: "uppercase",
          padding: "4px 8px",
        }}
      >
        概览
      </div>
      <div style={{ padding: "4px 10px", color: "#666", fontSize: 12 }}>
        卡牌 {cards.length}
      </div>
      <div style={{ padding: "4px 10px", color: "#666", fontSize: 12 }}>
        类型 {cardTypes.length}
      </div>
    </div>
  );
}