import type { Card, CardType } from "../../core/ipc";
import { FoilOverlay } from "./primitives/FoilOverlay";
import { mapContent, resolveFeatures } from "./mapping";
import {
  DEFAULT_CARD_STYLE_ID,
  getCardStyle,
  isCardStyleId,
} from "./styles/registry";
import type { StyleContent } from "./styles/types";
import { SIZE_MAP, type CardFrameSize } from "./types";

export type { CardFrameSize } from "./types";
export type { CardStyleDef, CardStyleProps } from "./styles/types";
export { CARD_ACCENT_PRESETS, SIZE_MAP } from "./types";
export {
  DEFAULT_CARD_STYLE_ID,
  getCardStyle,
  isCardStyleId,
  listCardStyles,
} from "./styles/registry";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  /** 显式指定风格 id；优先级高于 cardType.card_frame.style */
  style?: string | null;
  selected?: boolean;
  foil?: boolean;
  onClick?: () => void;
}

/**
 * 风格解析优先级：
 *   1. 显式传入的 style prop（须为已注册 id）
 *   2. cardType.card_frame.style（须为已注册 id）
 *   3. DEFAULT_CARD_STYLE_ID
 *
 * 任何未知 id 最终都由 getCardStyle 回退到 yugioh。
 */
function resolveStyleId(
  explicit: string | null | undefined,
  cardType: CardType,
): string {
  if (explicit && isCardStyleId(explicit)) return explicit;
  const raw = cardType.card_frame?.style;
  return isCardStyleId(raw) ? raw : DEFAULT_CARD_STYLE_ID;
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
  const def = getCardStyle(resolveStyleId(style, cardType));
  const StyleComponent = def.Component;

  // 内容与特性只算一次；裁剪/出框合入 content，闪卡留在外层处理
  const content = mapContent(card, cardType);
  const features = resolveFeatures(card, cardType);
  const renderContent: StyleContent = {
    ...content,
    crop: features.crop,
    extend: features.extend,
  };

  function renderStyle() {
    return (
      <StyleComponent
        cardType={cardType}
        size={size}
        content={renderContent}
        selected={selected}
        onClick={onClick}
      />
    );
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
