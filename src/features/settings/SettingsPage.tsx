import { useEffect } from "react";
import { useUIStore, type SettingsCategory } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import { CATEGORIES } from "./categories";
import { ProjectGeneralPanel } from "./ProjectGeneralPanel";
import { ProjectResourcesPanel } from "./ProjectResourcesPanel";
import { AppInterfacePanel } from "./AppInterfacePanel";
import { AppEditorPanel } from "./AppEditorPanel";
import { AppVnPanel } from "./AppVnPanel";
import { AppAdvancedPanel } from "./AppAdvancedPanel";
import { ThemePanel } from "../project/ThemePanel";
import { StatsTab } from "../project/StatsTab";
import { ipc } from "../../core/ipc";
import { nowMs } from "../../lib/time";
import { runWithError } from "../../lib/runWithError";

export function SettingsPage() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const manifest = useProjectStore((s) => s.manifest);
  const setManifest = useProjectStore((s) => s.setManifest);

  const category = useUIStore((s) => s.settingsCategory);
  const setCategory = useUIStore((s) => s.setSettingsCategory);
  const close = useUIStore((s) => s.closeSettings);

  // 默认分类
  useEffect(() => {
    if (category) return;
    setCategory(projectPath ? "project:general" : "app:interface");
  }, [category, projectPath, setCategory]);

  // Esc 关闭
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // 主题切换时保存 Manifest
  async function saveThemeId(id: string | null) {
    if (!manifest) return;
    const next = { ...manifest, theme_id: id, updated_at: nowMs() };
    await runWithError(async () => {
      await ipc.saveManifest(next);
      setManifest(next);
    }, "保存失败");
  }

  const visibleCategories = CATEGORIES.filter(
    (c) => c.group === "app" || projectPath,
  );

  const projectCategories = visibleCategories.filter(
    (c) => c.group === "project",
  );
  const appCategories = visibleCategories.filter((c) => c.group === "app");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶栏 */}
      <div
        style={{
          height: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={close}
          style={{ fontSize: 13 }}
        >
          ← 返回
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
            color: "var(--fg-primary)",
            letterSpacing: 0.5,
          }}
        >
          设置
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            marginLeft: 4,
          }}
        >
          Esc 关闭
        </span>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* 左侧分类 */}
        <div
          style={{
            width: 240,
            borderRight: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
            padding: "12px 8px",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {projectCategories.length > 0 && (
            <>
              <GroupLabel>项目</GroupLabel>
              {projectCategories.map((c) => (
                <CategoryButton
                  key={c.key}
                  active={category === c.key}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </CategoryButton>
              ))}
            </>
          )}

          <GroupLabel style={{ marginTop: projectPath ? 16 : 0 }}>
            应用
          </GroupLabel>
          {appCategories.map((c) => (
            <CategoryButton
              key={c.key}
              active={category === c.key}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </CategoryButton>
          ))}
        </div>

        {/* 右侧内容 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "24px 32px",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            {category && (
              <CategoryContent category={category} onSaveTheme={saveThemeId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryContent({
  category,
  onSaveTheme,
}: {
  category: SettingsCategory;
  onSaveTheme: (id: string | null) => Promise<void>;
}) {
  switch (category) {
    case "project:general":
      return <ProjectGeneralPanel />;
    case "project:theme":
      return <ThemeCategory onSaveTheme={onSaveTheme} />;
    case "project:resources":
      return <ProjectResourcesPanel />;
    case "project:data":
      return <StatsTab />;
    case "app:interface":
      return <AppInterfacePanel />;
    case "app:editor":
      return <AppEditorPanel />;
    case "app:vn":
      return <AppVnPanel />;
    case "app:advanced":
      return <AppAdvancedPanel />;
    default:
      return null;
  }
}

function ThemeCategory({
  onSaveTheme,
}: {
  onSaveTheme: (id: string | null) => Promise<void>;
}) {
  const manifest = useProjectStore((s) => s.manifest);
  return (
    <ThemePanel
      manifestThemeId={manifest?.theme_id ?? null}
      onChangeThemeId={(id) => void onSaveTheme(id)}
    />
  );
}

function GroupLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        padding: "4px 10px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        border: "none",
        borderLeft: active
          ? "3px solid var(--accent-gold)"
          : "3px solid transparent",
        background: active ? "var(--bg-raised)" : "transparent",
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {children}
    </button>
  );
}
