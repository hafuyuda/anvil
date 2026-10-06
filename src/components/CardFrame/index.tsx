import type { Card, CardType } from "../../core/ipc";
import { CardFrameYuGiOh } from "./CardFrameYuGiOh";
import { CardFrameGeneric } from "./CardFrameGeneric";
import { CardFrameMinimal } from "./CardFrameMinimal";
import { CardFrameMTG } from "./CardFrameMTG";
import { CardFramePokemon } from "./CardFramePokemon";
import {
  DEFAULT_CARD_FRAME_STYLE,
  type CardFrameSize,
  type CardFrameStyle,
} from "./types";

export type { CardFrameSize, CardFrameStyle } from "./types";
export {
  DEFAULT_CARD_FRAME_STYLE,
  CARD_FRAME_STYLE_LABELS,
  SIZE_MAP,
} from "./types";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  style?: CardFrameStyle;
  selected?: boolean;
  onClick?: () => void;
}

const VALID_STYLES: ReadonlySet<string> = new Set([
  "yugioh",
  "generic",
  "minimal",
  "mtg",
  "pokemon",
]);

/**
 * 风格解析优先级：
 *   1. 显式传入的 style prop
 *   2. cardType.card_frame.style（若合法）
 *   3. DEFAULT_CARD_FRAME_STYLE
 */
function resolveStyle(
  explicit: CardFrameStyle | undefined,
  cardType: CardType,
): CardFrameStyle {
  if (explicit) return explicit;
  const raw = cardType.card_frame?.style;
  if (typeof raw === "string" && VALID_STYLES.has(raw)) {
    return raw as CardFrameStyle;
  }
  return DEFAULT_CARD_FRAME_STYLE;
}

export function CardFrame({
  card,
  cardType,
  size = "medium",
  style,
  selected,
  onClick,
}: Props) {
  const resolved = resolveStyle(style, cardType);
  const common = { card, cardType, size, selected, onClick };

  switch (resolved) {
    case "generic":
      return <CardFrameGeneric {...common} />;
    case "minimal":
      return <CardFrameMinimal {...common} />;
    case "mtg":
      return <CardFrameMTG {...common} />;
    case "pokemon":
      return <CardFramePokemon {...common} />;
    case "yugioh":
    default:
      return <CardFrameYuGiOh {...common} />;
  }
}
