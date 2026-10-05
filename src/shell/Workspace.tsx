import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { CardWall } from "../features/cards/CardWall";
import { CardTypeList } from "../features/cards/CardTypeList";
import { GraphView } from "../features/world/GraphView";
import { ScenarioList } from "../features/story/ScenarioList";
import { BoardList } from "../features/board/BoardList";
import { SessionList } from "../features/session/SessionList";
import { ErrorBoundary } from "./ErrorBoundary";

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
          color: "var(--fg-secondary)",
          background: "var(--bg-app)",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontFamily: "var(--font-title)",
            color: "var(--accent-gold)",
            letterSpacing: 2,
          }}
        >
          未打开项目
        </div>
        <button
          className="btn btn-primary"
          onClick={openProject}
          style={{ padding: "8px 24px", fontSize: 13 }}
        >
          打开项目
        </button>
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          选择一个空文件夹，或已有的 .anvil 项目
        </div>
      </div>
    );
  }

  // 所有模块自己管内边距和滚动
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
        overflow: "hidden",
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