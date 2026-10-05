import { useProjectStore, type ModuleKey } from "../stores/projectStore";

const modules: { key: ModuleKey; label: string }[] = [
  { key: "world", label: "世界观" },
  { key: "story", label: "分支故事" },
  { key: "types", label: "类型" },
  { key: "board", label: "棋盘" },
  { key: "session", label: "跑团" },
];

export function LeftNav() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const worldSubView = useProjectStore((s) => s.worldSubView);
  const setWorldSubView = useProjectStore((s) => s.setWorldSubView);
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
        <div key={m.key}>
          <button
            onClick={() => setActiveModule(m.key)}
            disabled={!projectPath}
            style={{
              width: "100%",
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

          {m.key === "world" && activeModule === "world" && projectPath && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                marginTop: 2,
                paddingLeft: 12,
              }}
            >
              <button
                onClick={() => setWorldSubView("cards")}
                style={{
                  textAlign: "left",
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: 4,
                  background:
                    worldSubView === "cards" ? "#d8d8d8" : "transparent",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                卡片
              </button>
              <button
                onClick={() => setWorldSubView("graph")}
                style={{
                  textAlign: "left",
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: 4,
                  background:
                    worldSubView === "graph" ? "#d8d8d8" : "transparent",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                图谱
              </button>
            </div>
          )}
        </div>
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
