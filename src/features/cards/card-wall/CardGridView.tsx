import type { Card, CardType } from "../../../core/ipc";
import { CardFrame } from "../../../components/CardFrame";

interface Props {
  cards: Card[];
  cardTypes: CardType[];
  selectedCardIds: string[];
  onCardClick: (card: Card, e: React.MouseEvent) => void;
  onAddToBoard: (c: Card) => void;
}

export function CardGridView({
  cards,
  cardTypes,
  selectedCardIds,
  onCardClick,
  onAddToBoard,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        paddingTop: 4,
      }}
    >
      {cards.map((c) => {
        const ct = cardTypes.find((t) => t.id === c.type_id);
        if (!ct) {
          return (
            <div
              key={c.id}
              onClick={(e) => onCardClick(c, e)}
              style={{
                width: 190,
                height: 280,
                border: "1px dashed var(--danger)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--danger)",
                cursor: "pointer",
                background: "var(--bg-panel)",
              }}
            >
              找不到类型
            </div>
          );
        }

        const selected = selectedCardIds.includes(c.id);
        return (
          <div
            key={c.id}
            style={{ position: "relative" }}
            onClick={(e) => onCardClick(c, e)}
          >
            <CardFrame
              card={c}
              cardType={ct}
              size="medium"
              selected={selected}
            />
            <button
              className="btn btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                onAddToBoard(c);
              }}
              title="添加到棋盘"
              style={{
                position: "absolute",
                right: 4,
                top: 4,
                fontSize: 11,
                padding: "2px 6px",
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
              }}
            >
              → 棋盘
            </button>
          </div>
        );
      })}
    </div>
  );
}
