import type { Card } from "../../../core/ipc";

interface Props {
  cards: Card[];
  typeName: (id: string) => string;
  selectedCardIds: string[];
  onCardClick: (card: Card, e: React.MouseEvent) => void;
  onAddToBoard: (c: Card) => void;
}

export function CardListView({
  cards,
  typeName,
  selectedCardIds,
  onCardClick,
  onAddToBoard,
}: Props) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {cards.map((c) => {
        const active = selectedCardIds.includes(c.id);
        return (
          <li
            key={c.id}
            onClick={(e) => onCardClick(c, e)}
            style={{
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              background: active ? "var(--bg-raised)" : "transparent",
              borderLeft: active
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
            }}
          >
            <span style={{ flex: 1 }}>
              {c.name}{" "}
              <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>
                · {typeName(c.type_id)}
              </span>{" "}
              <span
                style={{
                  color: "var(--fg-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {c.id.slice(0, 8)}
              </span>
            </span>
            <button
              className="btn btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                onAddToBoard(c);
              }}
              style={{ fontSize: 11 }}
              title="添加到棋盘"
            >
              → 棋盘
            </button>
          </li>
        );
      })}
    </ul>
  );
}
