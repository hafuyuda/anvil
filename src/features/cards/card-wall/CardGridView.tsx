import { useMemo } from "react";
import type { Card, CardType } from "../../../core/ipc";
import { CardGrid, GridCard } from "../../../components/card/CardGrid";

interface Props {
  cards: Card[];
  cardTypes: CardType[];
  selectedCardIds: string[];
  onCardClick: (card: Card, e: React.MouseEvent) => void;
  onCardContextMenu?: (card: Card, e: React.MouseEvent) => void;
}

export function CardGridView({
  cards,
  cardTypes,
  selectedCardIds,
  onCardClick,
  onCardContextMenu,
}: Props) {
  const typeMap = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const t of cardTypes) m.set(t.id, t);
    return m;
  }, [cardTypes]);

  return (
    <CardGrid gap={16} paddingTop={4}>
      {cards.map((c) => (
        <GridCard
          key={c.id}
          card={c}
          cardType={typeMap.get(c.type_id) ?? null}
          size="medium"
          foil
          selected={selectedCardIds.includes(c.id)}
          onClick={(e) => onCardClick(c, e)}
          // FLIP 过渡靠这个属性找元素、对位置
          wrapperProps={{
            "data-card-id": c.id,
            onContextMenu: onCardContextMenu
              ? (e: React.MouseEvent) => onCardContextMenu(c, e)
              : undefined,
          }}
        />
      ))}
    </CardGrid>
  );
}
