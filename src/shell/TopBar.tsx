import { useEffect, useRef, useState } from "react";
import { ipc } from "../core/ipc";
import { useProjectStore } from "../stores/projectStore";
import { useOpenProject } from "../hooks/useOpenProject";
import { useCreateProject } from "../hooks/useCreateProject";
import { useExportPack } from "../hooks/useExportPack";
import { useImportPack } from "../hooks/useImportPack";
import { useUIStore } from "../stores/uiStore";
import { resetTheme } from "../lib/theme";
import { setLastOpenPath } from "../lib/recentProjects";
import { clearAssetCache } from "../lib/assetCache";
import { runWithError } from "../lib/runWithError";

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
        paddingRight: "calc(12px + var(--tauri-frame-controls-width, 138px))",
      }}
    >
      {/* 项目菜单 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            border: "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            background: menuOpen ? "var(--bg-raised)" : "transparent",
            color: "var(--fg-primary)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            if (!menuOpen) {
              (e.currentTarget as HTMLElement).style.background =
                "var(--bg-surface)";
            }
          }}
          onMouseLeave={(e) => {
            if (!menuOpen) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }
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
          <span
            style={{
              color: "var(--fg-secondary)",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {projectName}
          </span>
          <span style={{ color: "var(--fg-muted)", fontSize: 10 }}>▾</span>
        </button>

        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              width: 220,
              background: "var(--bg-panel)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              padding: 4,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
            }}
          >
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
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: hover
          ? danger
            ? "color-mix(in srgb, var(--danger) 20%, transparent)"
            : "var(--bg-raised)"
          : "transparent",
        color: danger ? "var(--danger)" : "var(--fg-primary)",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border-subtle)",
        margin: "4px 6px",
      }}
    />
  );
}
