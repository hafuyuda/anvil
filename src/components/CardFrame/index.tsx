import type { Card, CardType } from "../../core/ipc";
import { CardFrameYuGiOh } from "./styles/YuGiOh";
import { CardFrameGeneric } from "./styles/Generic";
import { CardFrameMinimal } from "./styles/Minimal";
import { CardFrameMTG } from "./styles/MTG";
import { CardFramePokemon } from "./styles/Pokemon";
import { FoilOverlay } from "./primitives/FoilOverlay";
import { mapContent, resolveFeatures } from "./mapping";
import {
  DEFAULT_CARD_FRAME_STYLE,
  SIZE_MAP,
  isCardFrameStyle,
  type CardFrameSize,
  type CardFrameStyle,
} from "./types";

export type { CardFrameSize, CardFrameStyle } from "./types";
export {
  DEFAULT_CARD_FRAME_STYLE,
  CARD_FRAME_STYLE_LABELS,
  CARD_ACCENT_PRESETS,
  SIZE_MAP,
  isCardFrameStyle,
} from "./types";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  style?: CardFrameStyle;
  selected?: boolean;
  foil?: boolean;
  onClick?: () => void;
}

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
  return isCardFrameStyle(raw) ? raw : DEFAULT_CARD_FRAME_STYLE;
}

export function CardFrame({
  card,
  cardType,
  size = "medium",
  style,
  selected,
  foil = false,
  onClick,
}: Props) {
  const resolved = resolveStyle(style, cardType);

  // 内容与特性只算一次，传给风格组件
  const content = mapContent(card, cardType);
  const features = resolveFeatures(card, cardType);

  const common = {
    cardType,
    size,
    content,
    features,
    selected,
    onClick,
  };

  function renderStyle() {
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

  // 闪卡：prop 启用 且 数据命中触发条件
  const shouldFoil = foil === true && features.foil === true;

  if (!shouldFoil) {
    return renderStyle();
  }

  const spec = SIZE_MAP[size];

  return (
    <div
      style={{
        position: "relative",
        width: spec.w,
        height: spec.h,
        flexShrink: 0,
      }}
    >
      {renderStyle()}
      <FoilOverlay radius={spec.borderRadius} variant={features.foilVariant} />
    </div>
  );
}
