import type { Card, CardType } from "../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "./types";
import { mapCard } from "./mapping";
import { CardImage } from "./CardImage";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  selected?: boolean;
  onClick?: () => void;
}

export function CardFrameYuGiOh({
  card,
  cardType,
  size = "medium",
  selected = false,
  onClick,
}: Props) {
  const spec = SIZE_MAP[size];
  const m = mapCard(card, cardType);
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const displayBody = m.body.length > 0 ? m.body : (cardType.description ?? "");
  const stars = m.level ? "★".repeat(Math.min(m.level, 12)) : "";

  // 由强调色派生出的描边/加深色，统一走 color-mix，兼容 hex 与 CSS 变量
  const accentSoft = `color-mix(in srgb, ${accent} 40%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 55%, transparent)`;
  const accentTitleTop = accent;
  const accentTitleBottom = shade(accent, 80);
  const accentTitleBorder = shade(accent, 70);

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        padding: 3,
        boxSizing: "border-box",
        background: `linear-gradient(145deg, var(--card-yugioh-outer-1) 0%, var(--card-yugioh-outer-2) 50%, var(--card-yugioh-outer-3) 100%)`,
        boxShadow: selected
          ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, var(--card-yugioh-shadow-selected)`
          : "var(--card-yugioh-shadow)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: `1px solid ${accent}`,
          borderRadius: spec.borderRadius - 2,
          padding: spec.padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: spec.padding / 2,
          background: `linear-gradient(180deg, var(--card-yugioh-inner-bg-1) 0%, var(--card-yugioh-inner-bg-2) 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 6px",
            flexShrink: 0,
            background: `linear-gradient(180deg, ${accentTitleTop} 0%, ${accentTitleBottom} 100%)`,
            borderRadius: 3,
            border: `1px solid ${accentTitleBorder}`,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize,
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 0 rgba(0,0,0,0.4)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-title)",
            }}
            title={m.title}
          >
            {m.title}
          </span>
          <span
            style={{
              fontSize: spec.metaSize,
              color: "#fff",
              opacity: 0.9,
              flexShrink: 0,
              marginLeft: 4,
            }}
          >
            {cardType.icon ?? "◆"}
          </span>
        </div>

        {/* 副标题（可选） */}
        {m.subtitle && (
          <div
            style={{
              fontSize: spec.metaSize,
              color: "var(--card-yugioh-text-dim)",
              textAlign: "center",
              padding: "0 4px",
              fontStyle: "italic",
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={m.subtitle}
          >
            {m.subtitle}
          </div>
        )}

        {/* 图像区 */}
        <CardImage
          path={m.image}
          crop={m.crop}
          extend={m.extend}
          height={spec.imageHeight}
          borderRadius={spec.borderRadius - 3}
          border={`1px solid ${accentStrong}`}
          background={`color-mix(in srgb, ${accent} 22%, var(--card-yugioh-inner-bg-2))`}
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.4,
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                color: `color-mix(in srgb, ${accent} 70%, #000)`,
                textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                letterSpacing: 2,
                userSelect: "none",
              }}
            >
              {m.title.slice(0, 2) || "?"}
            </div>
          }
        />

        {/* 等级星 */}
        {stars && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              fontSize: spec.metaSize,
              color: "var(--card-yugioh-star)",
              padding: "0 4px",
              textShadow: "0 0 1px #fff",
              flexShrink: 0,
            }}
          >
            {m.levelLabel && (
              <span
                style={{
                  color: "var(--card-yugioh-text-dim)",
                  fontStyle: "italic",
                  fontSize: spec.metaSize,
                }}
              >
                {m.levelLabel}
              </span>
            )}
            <span style={{ letterSpacing: -1 }}>{stars}</span>
          </div>
        )}

        {/* 类型行 */}
        <div
          style={{
            fontSize: spec.typeSize,
            textAlign: "center",
            color: "var(--card-yugioh-text-dim)",
            padding: "1px 0",
            borderTop: `1px solid ${accentSoft}`,
            borderBottom: `1px solid ${accentSoft}`,
            fontStyle: "italic",
            letterSpacing: 0.3,
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={m.typeLine}
        >
          {m.typeLine}
        </div>

        {/* 描述框 */}
        <div
          title={displayBody}
          style={{
            flex: 1,
            minHeight: 0,
            background: "var(--card-yugioh-parchment)",
            border: `1px solid ${accentStrong}`,
            borderRadius: 3,
            padding: `${spec.padding}px ${spec.padding + 2}px`,
            fontSize: spec.bodySize,
            lineHeight: 1.3,
            color: "var(--card-yugioh-text)",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "inherit",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            {displayBody}
          </div>

          {/* 底部渐隐：仅当内容溢出时视觉上更明显 */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 18,
              background: `linear-gradient(180deg, transparent 0%, var(--card-yugioh-parchment) 100%)`,
              pointerEvents: "none",
            }}
          />

          {/* ATK/DEF/HP */}
          {(m.atk !== undefined ||
            m.def !== undefined ||
            m.hp !== undefined) && (
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 2,
                display: "flex",
                gap: 8,
                fontSize: spec.statSize,
                fontWeight: 700,
                color: "var(--card-yugioh-text)",
                background: "var(--card-yugioh-parchment)",
                padding: "0 4px",
                borderRadius: 2,
              }}
            >
              {m.atk !== undefined && (
                <span>
                  {m.atkLabel ?? "ATK"}/{m.atk}
                </span>
              )}
              {m.def !== undefined && (
                <span>
                  {m.defLabel ?? "DEF"}/{m.def}
                </span>
              )}
              {m.hp !== undefined && (
                <span>
                  {m.hpLabel ?? "HP"}/{m.hp}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 把颜色按比例向黑色混合。
 * 输出 CSS color-mix，输入可为 hex 或 CSS 变量，由浏览器求值。
 * pct 为保留的亮色百分比：80 表示加深 20%。
 */
function shade(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, #000)`;
}
