import { useEffect, useRef, useState } from "react";
import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../core/actions/useOpenProject";
import { useCreateProject } from "../core/actions/useCreateProject";
import { useExportPack } from "../core/actions/useExportPack";
import { useImportPack } from "../core/actions/useImportPack";
import { useUIStore } from "../stores/uiStore";
import { resetTheme } from "../lib/theme";
import { setLastOpenPath } from "../lib/recentProjects";
import { clearAssetCache } from "../lib/assetCache";
import { bindPlayerToProject } from "../lib/audioPlayer";
import { runWithError } from "../lib/runWithError";
import { AddPresetDialog } from "../features/project/AddPresetDialog";

export function TopBar() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const closeProject = useProjectStore((s) => s.closeProject);
  const refreshProject = useProjectStore((s) => s.refreshProject);
  const setManifest = useProjectStore((s) => s.setManifest);

  const openProject = useOpenProject();
  const createProject = useCreateProject();
  const exportPack = useExportPack();
  const importPack = useImportPack();

  const openPalette = useUIStore((s) => s.openPalette);
  const openMergePack = useUIStore((s) => s.openMergePack);
  const openSettings = useUIStore((s) => s.openSettings);

  const [menuOpen, setMenuOpen] = useState(false);
  const [addPresetOpen, setAddPresetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleClose() {
    try {
      await ipc.closeProject();
    } catch {
      // ignore
    }
    closeProject();
    resetTheme();
    clearAssetCache();
    // 队列里的相对路径已无法解析（Rust 侧没有项目了），不清会让「下一首」静默失败
    bindPlayerToProject(null);
    setLastOpenPath(null);
  }

  async function handleRefresh() {
    if (!projectPath) return;
    await runWithError(async () => {
      const snap = await ipc.reloadProject();
      refreshProject({
        cards: snap.cards,
        cardTypes: snap.card_types,
        relationKinds: snap.relation_kinds,
        relations: snap.relations,
        scenarios: snap.scenarios,
        boards: snap.boards,
        sessions: snap.sessions,
        cardGroups: snap.card_groups,
      });
      const m = await ipc.loadManifest();
      setManifest(m);
    }, "刷新失败");
  }

  const projectName = projectPath
    ? projectPath.split(/[\\/]/).pop()
    : "未打开项目";

  return (
    <div className="topbar">
      {/* 项目菜单 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          className={menuOpen ? "menu-trigger is-open" : "menu-trigger"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <strong className="brand-mark">Anvil</strong>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span className="truncate" style={{ color: "var(--fg-secondary)", maxWidth: 220 }}>
            {projectName}
          </span>
          <span style={{ color: "var(--fg-muted)", fontSize: "var(--fs-xs)" }}>
            ▾
          </span>
        </button>

        {menuOpen && (
          <div className="menu">
            <MenuItem
              label={projectPath ? "切换项目…" : "打开项目…"}
              onClick={() => {
                setMenuOpen(false);
                openProject();
              }}
            />
            <MenuItem
              label="新建项目…"
              onClick={() => {
                setMenuOpen(false);
                createProject();
              }}
            />
            <MenuItem
              label="导入资源包…"
              onClick={() => {
                setMenuOpen(false);
                importPack();
              }}
            />

            <MenuItem
              label="添加预设…"
              disabled={!projectPath}
              onClick={() => {
                if (!projectPath) return;
                setMenuOpen(false);
                setAddPresetOpen(true);
              }}
            />

            {projectPath && (
              <>
                <Divider />
                <MenuItem
                  label="导出资源包…"
                  onClick={() => {
                    setMenuOpen(false);
                    exportPack();
                  }}
                />
                <MenuItem
                  label="合并资源包…"
                  onClick={() => {
                    setMenuOpen(false);
                    openMergePack();
                  }}
                />
                <MenuItem
                  label="刷新项目"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleRefresh();
                  }}
                />
                <Divider />
                <MenuItem
                  label="关闭项目"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    void handleClose();
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      <div data-tauri-drag-region style={{ flex: 1, alignSelf: "stretch" }} />

      {/* 搜索框 */}
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

      {/* 设置 */}
      <button className="btn" onClick={() => openSettings()}>
        设置
      </button>

      {addPresetOpen && (
        <AddPresetDialog onClose={() => setAddPresetOpen(false)} />
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const cls = ["menu-item", danger && "is-danger"].filter(Boolean).join(" ");
  return (
    <button
      className={cls}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick();
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="menu-sep" />;
}
