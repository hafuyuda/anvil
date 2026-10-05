import type { Card, CardType } from "../../core/ipc";
import { CardFrameYuGiOh } from "./CardFrameYuGiOh";
import type { CardFrameSize, CardFrameStyle } from "./types";

export type { CardFrameSize, CardFrameStyle } from "./types";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  style?: CardFrameStyle;
  selected?: boolean;
  onClick?: () => void;
}

export function CardFrame({
  card,
  cardType,
  size = "medium",
  style = "yugioh",
  selected,
  onClick,
}: Props) {
  switch (style) {
    case "yugioh":
    default:
      return (
        <CardFrameYuGiOh
          card={card}
          cardType={cardType}
          size={size}
          selected={selected}
          onClick={onClick}
        />
      );
  }
}
