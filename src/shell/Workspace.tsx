import { useState } from "react";
import { Row, SectionLabel, Stack } from "../components/ui";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/actions/useOpenProject";
import { useCreateProject } from "../core/actions/useCreateProject";
import { openProjectAt } from "../core/actions/openProjectAt";
import { getRecentProjects, removeRecentProject } from "../lib/recentProjects";
import { CardWall } from "../features/cards/card-wall/CardWall";
import { CardTypeList } from "../features/cards/card-type/CardTypeList";
import { ScenarioList } from "../features/story/scenario/ScenarioList";
import { BoardList } from "../features/board/BoardList";
import { SessionList } from "../features/session/SessionList";
import { ErrorBoundary } from "./ErrorBoundary";
import { CardGroupList } from "../features/card-groups/CardGroupList";
import { toast } from "../lib/toast";
import { PlayerView } from "../features/player/PlayerView";
import { DocLibrary } from "../features/docs/DocLibrary";

export function Workspace() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const openProject = useOpenProject();
  const createProject = useCreateProject();

  const [recent, setRecent] = useState<string[]>(() => getRecentProjects());

  async function handleOpenRecent(path: string) {
    try {
      await openProjectAt(path);
    } catch (e) {
      toast.error("打开失败: " + e);
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
      <Stack
        align="center"
        justify="center"
        gap="var(--sp-8)"
        style={{
          flex: 1,
          color: "var(--fg-secondary)",
          background: "var(--bg-app)",
          padding: "var(--sp-12)",
          overflow: "auto",
        }}
      >
        <div className="welcome-brand">Anvil</div>
        <div className="muted">
          铁砧。世界观、剧情、棋盘、跑团，都在一张卡上。
        </div>

        <Row gap="var(--sp-4)">
          <button
            className="btn btn-primary"
            onClick={createProject}
            style={{
              padding: "var(--sp-4) var(--sp-10)",
              fontSize: "var(--fs-lg)",
            }}
          >
            新建项目
          </button>
          <button
            className="btn"
            onClick={openProject}
            style={{
              padding: "var(--sp-4) var(--sp-10)",
              fontSize: "var(--fs-lg)",
            }}
          >
            打开已有项目
          </button>
        </Row>

        {recent.length > 0 && (
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              marginTop: "var(--sp-8)",
            }}
          >
            <SectionLabel
              variant="block"
              style={{ paddingLeft: "var(--sp-2)" }}
            >
              最近项目
            </SectionLabel>
            <div className="panel">
              {recent.map((p) => {
                const name = p.split(/[\\/]/).pop() ?? p;
                return (
                  <div key={p} className="list-item" onClick={() => handleOpenRecent(p)}>
                    <span
                      style={{ color: "var(--accent-gold)", fontSize: "var(--fs-sm)" }}
                    >
                      ◆
                    </span>
                    <div className="grow">
                      <div
                        className="truncate"
                        style={{ color: "var(--fg-primary)", fontWeight: 500 }}
                      >
                        {name}
                      </div>
                      <div
                        className="truncate"
                        style={{
                          fontSize: "var(--fs-xs)",
                          color: "var(--fg-muted)",
                          fontFamily: "var(--font-mono)",
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
                        fontSize: "var(--fs-md)",
                        padding: "0 var(--sp-3)",
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
      </Stack>
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
      {/*
        模块内容按 activeModule 加 key：切模块时整个子树重新挂载，
        于是入场动画每次切换都会重放。
        注意模块本身本来就是条件渲染（切走即卸载），加 key 不额外丢状态。
      */}
      <div key={activeModule} className="module-enter" style={MODULE_HOST}>
        {activeModule === "world" && (
          <ErrorBoundary>
            <CardWall />
          </ErrorBoundary>
        )}
        {activeModule === "docs" && (
          <ErrorBoundary>
            <DocLibrary />
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
        {activeModule === "cardGroups" && (
          <ErrorBoundary>
            <CardGroupList />
          </ErrorBoundary>
        )}
        {activeModule === "session" && (
          <ErrorBoundary>
            <SessionList />
          </ErrorBoundary>
        )}
        {activeModule === "player" && (
          <ErrorBoundary>
            <PlayerView />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

const MODULE_HOST: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};
