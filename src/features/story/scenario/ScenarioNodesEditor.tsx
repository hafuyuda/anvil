import type { Card, CardType } from "../../../core/ipc";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  cards: Card[];
  cardTypes: CardType[];
}

export function ScenarioNodesEditor({
  selectedIds,
  onChange,
  cards,
  cardTypes,
}: Props) {
  function toggle(id: string, checked: boolean) {
    if (checked) onChange([...selectedIds, id]);
    else onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <>
      <div
        style={{
          fontSize: 11,
          color: "var(--fg-muted)",
          marginBottom: 6,
          padding: "6px 8px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        建议：剧情图的节点用「场景」类型卡，而不是角色或地点。
        场景卡的字段包括时间、地点、参与者、描述和对白，运行视图会显示这些信息。
      </div>
      <div
        style={{
          maxHeight: 220,
          overflow: "auto",
          border: "1px solid var(--border-subtle)",
          padding: 6,
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
        }}
      >
        {cards.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)", padding: 4 }}>
            还没有卡牌
          </div>
        )}
        {cards.map((c) => {
          const cardType = cardTypes.find((t) => t.id === c.type_id);
          const isScene = cardType?.name === "场景";
          return (
            <label
              key={c.id}
              style={{
                display: "flex",
                gap: 6,
                fontSize: 12,
                color: "var(--fg-secondary)",
                cursor: "pointer",
                padding: "2px 0",
                opacity: isScene ? 1 : 0.65,
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={(e) => toggle(c.id, e.target.checked)}
                style={{ accentColor: "var(--accent-gold)" }}
              />
              <span
                style={{
                  color: isScene ? "var(--fg-primary)" : undefined,
                }}
              >
                {c.name}
              </span>
              <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
                {cardType?.name ?? "?"}
              </span>
            </label>
          );
        })}
      </div>
    </>
  );
}