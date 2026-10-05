import { useState } from "react";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { useCreateProject } from "../core/useCreateProject";
import { openProjectAt } from "../core/openProjectAt";
import { getRecentProjects, removeRecentProject } from "../lib/recentProjects";
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
  const createProject = useCreateProject();

  const [recent, setRecent] = useState<string[]>(() => getRecentProjects());

  async function handleOpenRecent(path: string) {
    try {
      await openProjectAt(path);
    } catch (e) {
      alert("打开失败: " + e);
      // 清理失效记录
      removeRecentProject(path);
      setRecent(getRecentProjects());
    }
  }

  function handleRemove(path: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeRecentProject(path);
    setRecent(getRecentProjects());
  }

  if (!projectPath) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          color: "var(--fg-secondary)",
          background: "var(--bg-app)",
          padding: 24,
          overflow: "auto",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontFamily: "var(--font-title)",
            color: "var(--accent-gold)",
            letterSpacing: 3,
          }}
        >
          Anvil
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--fg-muted)",
            marginTop: -12,
          }}
        >
          铁砧。世界观、剧情、棋盘、跑团，都在一张卡上。
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            className="btn btn-primary"
            onClick={createProject}
            style={{ padding: "8px 20px", fontSize: 13 }}
          >
            新建项目
          </button>
          <button
            className="btn"
            onClick={openProject}
            style={{ padding: "8px 20px", fontSize: 13 }}
          >
            打开已有项目
          </button>
        </div>

        {recent.length > 0 && (
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              marginTop: 24,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
                paddingLeft: 4,
              }}
            >
              最近项目
            </div>
            <div
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-panel)",
                overflow: "hidden",
              }}
            >
              {recent.map((p, i) => {
                const name = p.split(/[\\/]/).pop() ?? p;
                return (
                  <div
                    key={p}
                    onClick={() => handleOpenRecent(p)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom:
                        i < recent.length - 1
                          ? "1px solid var(--border-subtle)"
                          : "none",
                      fontSize: 13,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-surface)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }}
                  >
                    <span
                      style={{
                        color: "var(--accent-gold)",
                        fontSize: 11,
                      }}
                    >
                      ◆
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "var(--fg-primary)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--fg-muted)",
                          fontFamily: "var(--font-mono)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={(e) => handleRemove(p, e)}
                      title="从最近项目移除"
                      style={{
                        fontSize: 12,
                        padding: "1px 6px",
                        color: "var(--fg-muted)",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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
