import { useEffect, useMemo, useState } from "react";
import { useUIStore } from "../../stores/uiStore";
import { useProjectStore } from "../../stores/projectStore";
import {
  DEFAULT_SETTINGS_CATEGORY,
  getCategory,
  listCategories,
  type CategoryDef,
} from "./categories/registry";
import { SettingsSearch } from "./SettingsSearch";
import { ipc } from "../../core/ipc";
import { nowMs } from "../../lib/time";
import { runWithError } from "../../lib/runWithError";

const PANEL_WIDTH = 1000;
const PANEL_HEIGHT = 680;
const NAV_WIDTH = 200;

export function SettingsPage() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const manifest = useProjectStore((s) => s.manifest);
  const setManifest = useProjectStore((s) => s.setManifest);

  const category = useUIStore((s) => s.settingsCategory);
  const setCategory = useUIStore((s) => s.setSettingsCategory);
  const close = useUIStore((s) => s.closeSettings);

  const visibleCategories = useMemo(
    () => listCategories().filter((c) => !c.requiresProject || !!projectPath),
    [projectPath],
  );

  // 默认 / 失效分类 → 第一个可见
  useEffect(() => {
    if (category && visibleCategories.some((c) => c.id === category)) return;
    setCategory(visibleCategories[0]?.id ?? DEFAULT_SETTINGS_CATEGORY);
  }, [category, visibleCategories, setCategory]);

  // 键盘：Esc 关闭；↑↓ 切分类
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      const t = e.target as HTMLElement;
      const isInField =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.tagName === "SELECT";
      if (isInField) return;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const idx = visibleCategories.findIndex((c) => c.id === category);
        if (idx < 0) return;
        const next =
          e.key === "ArrowDown"
            ? (idx + 1) % visibleCategories.length
            : (idx - 1 + visibleCategories.length) % visibleCategories.length;
        setCategory(visibleCategories[next].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [category, visibleCategories, setCategory, close]);

  async function saveThemeId(id: string | null) {
    if (!manifest) return;
    const next = { ...manifest, theme_id: id, updated_at: nowMs() };
    await runWithError(async () => {
      await ipc.saveManifest(next);
      setManifest(next);
    }, "保存失败");
  }

  function handleMaskClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  return (
    <div
      onClick={handleMaskClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: PANEL_WIDTH,
          maxWidth: "calc(100vw - 48px)",
          height: PANEL_HEIGHT,
          maxHeight: "calc(100vh - 48px)",
          background: "var(--bg-app)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: [
            "0 24px 64px rgba(0,0,0,0.7)",
            "inset 0 1px 0 color-mix(in srgb, var(--accent-gold) 10%, transparent)",
            "inset 0 0 0 1px color-mix(in srgb, var(--accent-gold) 5%, transparent)",
          ].join(", "),
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 顶栏（两行） */}
        <div
          style={{
            flexShrink: 0,
            background: `linear-gradient(135deg,
              var(--bg-panel) 0%,
              color-mix(in srgb, var(--accent-copper) 5%, var(--bg-panel)) 100%)`,
            borderBottom: "1px solid var(--border-subtle)",
            position: "relative",
          }}
        >
          {/* 第一行：标题  关闭 */}
          <div
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 8,
            }}
          >
            <span
              style={{
                color: "var(--accent-gold)",
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ⚒
            </span>
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

            <div style={{ flex: 1 }} />

            <button
              className="btn btn-ghost"
              onClick={close}
              title="关闭 (Esc)"
              style={{
                padding: "2px 10px",
                fontSize: 16,
                color: "var(--fg-secondary)",
              }}
            >
              ×
            </button>
          </div>

          {/* 第二行：搜索框 */}
          <div style={{ padding: "0 12px 10px" }}>
            <SettingsSearch onNavigate={setCategory} />
          </div>

          {/* 底部金线渐隐 */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, var(--accent-gold), transparent)",
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* 主体 */}
        <div className="fill">
          {/* 左：分类 */}
          <div
            style={{
              width: NAV_WIDTH,
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--bg-panel)",
              padding: "12px 8px",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {visibleCategories.map((c) => (
              <CategoryItem
                key={c.id}
                category={c}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
              />
            ))}
          </div>

          {/* 右：内容 */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              padding: "24px 28px",
            }}
          >
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              {category && (
                <CategoryContent
                  category={category}
                  onSaveTheme={saveThemeId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryItem({
  category,
  active,
  onClick,
}: {
  category: CategoryDef;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "8px 12px",
        marginBottom: 2,
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: active
          ? "linear-gradient(90deg, color-mix(in srgb, var(--accent-copper) 22%, transparent), transparent 80%)"
          : hover
            ? "color-mix(in srgb, var(--accent-gold) 6%, transparent)"
            : "transparent",
        boxShadow: active ? "inset 3px 0 0 var(--accent-gold)" : "none",
        color: active ? "var(--accent-gold)" : "var(--fg-secondary)",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        fontFamily: "inherit",
        cursor: "pointer",
        transition: "background 120ms, color 120ms",
      }}
    >
      <span
        style={{
          color: active ? "var(--accent-gold)" : "var(--fg-muted)",
          fontSize: 12,
          flexShrink: 0,
          width: 14,
          textAlign: "center",
        }}
      >
        {category.glyph}
      </span>
      {category.label}
    </button>
  );
}

function CategoryContent({
  category,
  onSaveTheme,
}: {
  category: string;
  onSaveTheme: (id: string | null) => Promise<void>;
}) {
  // 未知 id 由 getCategory 回退默认分类；Panel 分派不再需要 switch。
  const { Panel } = getCategory(category);
  return <Panel onSaveTheme={onSaveTheme} />;
}
