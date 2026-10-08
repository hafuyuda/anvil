import type { Card, CardType } from "../../core/ipc";

interface Props {
  cardIds: string[];
  cardById: Map<string, Card>;
  typeById: Map<string, CardType>;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

export function CardGroupCardList({
  cardIds,
  cardById,
  typeById,
  onMove,
  onRemove,
}: Props) {
  if (cardIds.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          color: "var(--fg-muted)",
          fontSize: 12,
          border: "1px dashed var(--border-default)",
          borderRadius: "var(--radius-md)",
        }}
      >
        还没有卡牌。点「+ 添加卡牌」开始。
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      {cardIds.map((id, i) => {
        const card = cardById.get(id);
        const type = card ? typeById.get(card.type_id) : null;
        return (
          <li
            key={id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderBottom:
                i < cardIds.length - 1
                  ? "1px solid var(--border-subtle)"
                  : "none",
              fontSize: 12,
            }}
          >
            <span
              style={{
                color: "var(--fg-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                minWidth: 24,
                textAlign: "right",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                color: card ? "var(--fg-primary)" : "var(--fg-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={card?.name ?? id}
            >
              {card?.name ?? `（已删除 ${id.slice(0, 8)}）`}
            </span>
            {type && (
              <span
                style={{
                  color: "var(--fg-muted)",
                  fontSize: 11,
                  flexShrink: 0,
                }}
              >
                {type.name}
              </span>
            )}
            <button
              className="btn btn-ghost"
              onClick={() => onMove(id, -1)}
              disabled={i === 0}
              title="上移"
              style={{
                fontSize: 11,
                padding: "1px 6px",
                color: "var(--fg-muted)",
              }}
            >
              ↑
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onMove(id, 1)}
              disabled={i === cardIds.length - 1}
              title="下移"
              style={{
                fontSize: 11,
                padding: "1px 6px",
                color: "var(--fg-muted)",
              }}
            >
              ↓
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => onRemove(id)}
              title="移除"
              style={{
                fontSize: 12,
                padding: "1px 6px",
                color: "var(--danger)",
              }}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}