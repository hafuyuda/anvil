import type { Board, Session, SessionViewMode } from "../../core/ipc";
import { SaveInput } from "../../components/ui/SaveInput";
import { useProjectStore } from "../../stores/projectStore";
import { RULE_SETS, type RuleSetId } from "./ruleset";

interface Props {
  session: Session;
  boards: Board[];
  view: SessionViewMode;
  ruleSet: RuleSetId;
  onRename: (name: string) => void;
  onSelectBoard: (boardId: string) => void;
  onViewChange: (view: SessionViewMode) => void;
  onRuleSetChange: (id: RuleSetId) => void;
  onOpenReplay: () => void;
}

export function SessionTopBar({
  session,
  boards,
  view,
  ruleSet,
  onRename,
  onSelectBoard,
  onViewChange,
  onRuleSetChange,
  onOpenReplay,
}: Props) {
  const setActiveModule = useProjectStore((s) => s.setActiveModule);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}
    >
      <SaveInput
        value={session.name}
        onCommit={onRename}
        style={{
          width: 200,
          flexShrink: 0,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--font-title)",
        }}
      />

      {/* 帷幕开关：同一份数据，两个视图 */}
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <ViewButton
          active={view === "gm"}
          onClick={() => onViewChange("gm")}
          title="KP 全景：看得到秘密消息，可编辑"
        >
          KP 全景
        </ViewButton>
        <ViewButton
          active={view === "player"}
          onClick={() => onViewChange("player")}
          title="玩家视图：秘密消息不可见，只读"
        >
          玩家视图
        </ViewButton>
      </div>

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
          flexShrink: 0,
        }}
      >
        规则集
        <select
          className="select"
          value={ruleSet}
          onChange={(e) => onRuleSetChange(e.target.value as RuleSetId)}
          style={{ width: "auto" }}
        >
          {RULE_SETS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <div style={{ flex: 1 }} />

      <label
        style={{
          fontSize: 12,
          display: "flex",
          gap: 6,
          alignItems: "center",
          color: "var(--fg-secondary)",
        }}
      >
        战场棋盘
        <select
          className="select"
          value={session.board_id ?? ""}
          onChange={(e) => onSelectBoard(e.target.value)}
          style={{ minWidth: 140, width: "auto" }}
        >
          <option value="">— 无 —</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn"
        onClick={onOpenReplay}
        title="回放本局在棋盘上的每一步动作"
        style={{ fontSize: 12 }}
      >
        牌谱
      </button>

      <button
        className="btn"
        onClick={() => setActiveModule("player")}
        title="打开 BGM 播放器 (Ctrl+M)"
        style={{ fontSize: 12 }}
      >
        🎵 BGM
      </button>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn"
      onClick={onClick}
      title={title}
      style={{
        fontSize: 12,
        padding: "4px 10px",
        background: active ? "var(--bg-raised)" : "var(--bg-surface)",
        borderColor: active ? "var(--accent-gold)" : "var(--border-default)",
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  );
}
