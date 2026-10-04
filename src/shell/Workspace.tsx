import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { CardWall } from "../features/cards/CardWall";
import { CardTypeList } from "../features/cards/CardTypeList";
import { GraphView } from "../features/world/GraphView";
import { ScenarioList } from "../features/story/ScenarioList";

export function Workspace() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const worldSubView = useProjectStore((s) => s.worldSubView);
  const openProject = useOpenProject();

  if (!projectPath) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "#666",
        }}
      >
        <div style={{ fontSize: 14 }}>未打开项目</div>
        <button
          onClick={openProject}
          style={{ padding: "8px 20px", fontSize: 14 }}
        >
          打开项目
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: activeModule === "world" && worldSubView === "graph" ? 0 : 16,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {activeModule === "world" && worldSubView === "cards" && <CardWall />}
      {activeModule === "world" && worldSubView === "graph" && <GraphView />}
      {activeModule === "types" && <CardTypeList />}
      {activeModule === "story" && <ScenarioList />}
    </div>
  );
}
