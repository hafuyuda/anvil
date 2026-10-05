import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { CardWall } from "../features/cards/CardWall";
import { CardTypeList } from "../features/cards/CardTypeList";
import { GraphView } from "../features/world/GraphView";
import { ScenarioList } from "../features/story/ScenarioList";
import { BoardList } from "../features/board/BoardList";
import { ErrorBoundary } from "./ErrorBoundary";
import { SessionList } from "../features/session/SessionList";

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
        <div style={{ fontSize: 12, color: "#aaa" }}>
          选择一个空文件夹，或已有的 .anvil 项目
        </div>
      </div>
    );
  }

  const isGraph =
    (activeModule === "world" && worldSubView === "graph") ||
    activeModule === "story" ||
    activeModule === "board" ||
    activeModule === "session" ||
    activeModule === "types";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: isGraph ? "hidden" : "auto",
        padding: isGraph ? 0 : 16,
      }}
    >
      {activeModule === "world" && worldSubView === "cards" && (
        <ErrorBoundary>
          <CardWall />
        </ErrorBoundary>
      )}
      {activeModule === "world" && worldSubView === "graph" && (
        <ErrorBoundary>
          <GraphView />
        </ErrorBoundary>
      )}
      {activeModule === "types" && (
        <ErrorBoundary>
          <CardTypeList />
        </ErrorBoundary>
      )}
      {activeModule === "story" && (
        <ErrorBoundary>
          <ScenarioList />
        </ErrorBoundary>
      )}
      {activeModule === "board" && (
        <ErrorBoundary>
          <BoardList />
        </ErrorBoundary>
      )}
      {activeModule === "session" && (
        <ErrorBoundary>
          <SessionList />
        </ErrorBoundary>
      )}
    </div>
  );
}
