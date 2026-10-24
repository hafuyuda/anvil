import type { CardGroup, Session } from "../../core/ipc";
import { SaveInput } from "../../components/ui/SaveInput";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  session: Session;
  cardGroups: CardGroup[];
  onRename: (name: string) => void;
  onSelectGroup: (groupId: string | null) => void;
}

export function SessionTopBar({
  session,
  cardGroups,
  onRename,
  onSelectGroup,
}: Props) {
  const setActiveModule = useProjectStore((s) => s.setActiveModule);

  const group = cardGroups.find((g) => g.id === session.group_id) ?? null;

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
        队伍卡组
        <select
          className="select"
          value={session.group_id ?? ""}
          onChange={(e) => onSelectGroup(e.target.value || null)}
          style={{ minWidth: 140, width: "auto" }}
        >
          <option value="">— 无 —</option>
          {cardGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}（{g.card_ids.length}）
            </option>
          ))}
        </select>
      </label>

      {group && (
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {group.card_ids.length} 名成员
        </span>
      )}

      <button
        className="btn"
        onClick={() => setActiveModule("cardGroups")}
        title="管理卡组"
        style={{ fontSize: 12 }}
      >
        管理卡组
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
