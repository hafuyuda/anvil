import { useState } from "react";
import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/useOpenProject";
import { useCreateProject } from "../core/useCreateProject";
import { useExportPack } from "../core/useExportPack";
import { useImportPack } from "../core/useImportPack";
import { ProjectSettingsDialog } from "../features/project/ProjectSettingsDialog";
import { useUIStore } from "../stores/uiStore";
import { resetTheme } from "../lib/theme";
import { setLastOpenPath } from "../lib/recentProjects";
import { clearImageCache } from "../lib/imageCache";

export function TopBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const setProject = useProjectStore((s) => s.setProject);
  const closeProject = useProjectStore((s) => s.closeProject);
  const pendingSaves = useProjectStore((s) => s.pendingSaves);
  const undoStack = useProjectStore((s) => s.undoStack) ?? [];
  const redoStack = useProjectStore((s) => s.redoStack) ?? [];
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const openProject = useOpenProject();
  const createProject = useCreateProject();
  const exportPack = useExportPack();
  const importPack = useImportPack();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const openPalette = useUIStore((s) => s.openPalette);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openMergePack = useUIStore((s) => s.openMergePack);

  async function handleClose() {
    try {
      await ipc.closeProject();
    } catch {
      //ignore
    }
    closeProject();
    resetTheme();
    clearImageCache();
    setLastOpenPath(null);
  }

  const refreshProject = useProjectStore((s) => s.refreshProject);

  async function handleRefresh() {
    if (!projectPath) return;
    try {
      const snap = await ipc.reloadProject();
      refreshProject({
        cards: snap.cards,
        cardTypes: snap.card_types,
        relationKinds: snap.relation_kinds,
        relations: snap.relations,
        scenarios: snap.scenarios,
        boards: snap.boards,
        sessions: snap.sessions,
      });
    } catch (e) {
      alert("刷新失败: " + e);
    }
  }

  const statusText = !projectPath
    ? ""
    : pendingSaves > 0
      ? "保存中…"
      : "已保存";

  return (
    <>
      <div
        style={{
          height: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          gap: 8,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <strong
          style={{
            color: "var(--accent-gold)",
            fontFamily: "var(--font-title)",
            fontSize: 15,
            letterSpacing: 1,
          }}
        >
          Anvil
        </strong>
        <span style={{ color: "var(--border-default)" }}>·</span>
        <span style={{ color: "var(--fg-secondary)" }}>
          {projectPath ? projectPath.split(/[\\/]/).pop() : "未打开项目"}
        </span>

        <button className="btn" onClick={openProject}>
          {projectPath ? "切换" : "打开"}
        </button>
        {!projectPath && (
          <>
            <button className="btn btn-primary" onClick={createProject}>
              新建项目
            </button>
            <button className="btn" onClick={importPack}>
              导入包
            </button>
          </>
        )}

        {projectPath && (
          <>
            <button className="btn" onClick={handleRefresh}>
              刷新
            </button>
            <button className="btn" onClick={exportPack}>
              导出包
            </button>
            <button className="btn" onClick={openMergePack}>
              合并包
            </button>
            <button
              className="btn btn-icon"
              onClick={() => void undo()}
              disabled={undoStack.length === 0}
              title="撤销 Ctrl+Z"
            >
              ↶
            </button>
            <button
              className="btn btn-icon"
              onClick={() => void redo()}
              disabled={redoStack.length === 0}
              title="重做 Ctrl+Shift+Z"
            >
              ↷
            </button>
            <span
              style={{
                fontSize: 11,
                color:
                  pendingSaves > 0 ? "var(--accent-flame)" : "var(--fg-muted)",
              }}
            >
              {statusText}
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />
        <button
          className="input"
          onClick={openPalette}
          style={{
            width: 240,
            fontSize: 12,
            textAlign: "left",
            cursor: "pointer",
            color: "var(--fg-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-surface)",
          }}
        >
          <span>搜索或执行命令…</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
            Ctrl+K
          </span>
        </button>

        <button
          className="btn"
          onClick={() => setSettingsOpen(true)}
          disabled={!projectPath}
        >
          设置
        </button>
        {projectPath && (
          <button className="btn btn-danger" onClick={handleClose}>
            关闭项目
          </button>
        )}
      </div>

      {settingsOpen && (
        <ProjectSettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
