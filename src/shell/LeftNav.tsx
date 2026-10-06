import { useProjectStore, type ModuleKey } from "../stores/projectStore";

const MODULES: { key: ModuleKey; label: string; glyph: string }[] = [
  { key: "world", label: "世界观", glyph: "◈" },
  { key: "story", label: "视觉小说", glyph: "❖" },
  { key: "board", label: "棋盘", glyph: "▦" },
  { key: "session", label: "跑团", glyph: "✦" },
  { key: "types", label: "类型", glyph: "◇" },
];

export function LeftNav() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const worldSubView = useProjectStore((s) => s.worldSubView);
  const setWorldSubView = useProjectStore((s) => s.setWorldSubView);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];

  return (
    <div
      style={{
        width: "var(--leftnav-w)",
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      <SectionLabel>模块</SectionLabel>

      {MODULES.map((m) => (
        <div key={m.key}>
          <NavButton
            active={activeModule === m.key}
            disabled={!projectPath}
            onClick={() => setActiveModule(m.key)}
          >
            <span style={{ marginRight: 8, color: "var(--accent-gold)" }}>
              {m.glyph}
            </span>
            {m.label}
          </NavButton>

          {m.key === "world" && activeModule === "world" && projectPath && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                marginTop: 2,
                paddingLeft: 14,
              }}
            >
              <SubNavButton
                active={worldSubView === "cards"}
                onClick={() => setWorldSubView("cards")}
              >
                卡片
              </SubNavButton>
              <SubNavButton
                active={worldSubView === "graph"}
                onClick={() => setWorldSubView("graph")}
              >
                图谱
              </SubNavButton>
            </div>
          )}
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <SectionLabel>概览</SectionLabel>
      <Stat label="卡牌" value={cards.length} />
      <Stat label="关系" value={relations.length} />
      <Stat label="类型" value={cardTypes.length} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        padding: "8px 8px 4px",
      }}
    >
      {children}
    </div>
  );
}

function NavButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        border: "none",
        borderLeft: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        background: active ? "var(--bg-raised)" : "transparent",
        color: disabled
          ? "var(--fg-muted)"
          : active
            ? "var(--fg-primary)"
            : "var(--fg-secondary)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function SubNavButton({
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
        textAlign: "left",
        padding: "4px 8px",
        border: "none",
        borderRadius: "var(--radius-sm)",
        background: active ? "var(--bg-surface)" : "transparent",
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 10px",
        color: "var(--fg-secondary)",
        fontSize: 12,
      }}
    >
      <span>{label}</span>
      <span
        style={{ color: "var(--fg-primary)", fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}
