import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";

const RAINBOW_GRADIENT =
  "linear-gradient(135deg, var(--card-rainbow-1) 0%, var(--card-rainbow-2) 18%, var(--card-rainbow-3) 36%, var(--card-rainbow-4) 54%, var(--card-rainbow-5) 72%, var(--card-rainbow-6) 86%, var(--card-rainbow-7) 100%)";

export function CardFrameRainbow({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const displayBody =
    content.body.length > 0 ? content.body : (cardType.description ?? "");

  const borderSoft = `color-mix(in srgb, ${accent} 35%, transparent)`;
  const stars = content.level ? "★".repeat(Math.min(content.level, 12)) : "";

  const hasStats =
    content.atk !== undefined ||
    content.def !== undefined ||
    content.hp !== undefined;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius + 2}
      padding={4}
      background={RAINBOW_GRADIENT}
      shadow="var(--card-rainbow-shadow)"
      shadowSelected="var(--card-rainbow-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius}
        padding={spec.padding}
        background="var(--card-rainbow-bg)"
        gap={spec.padding / 2}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 6px",
            flexShrink: 0,
            background: RAINBOW_GRADIENT,
            borderRadius: 3,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize,
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 1px rgba(0,0,0,0.45)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-title)",
            }}
            title={content.title}
          >
            {content.title}
          </span>
          <span
            style={{
              fontSize: spec.metaSize,
              color: "#fff",
              textShadow: "0 1px 1px rgba(0,0,0,0.45)",
              flexShrink: 0,
              marginLeft: 4,
            }}
          >
            {cardType.icon ?? "◆"}
          </span>
        </div>

        {content.subtitle && (
          <div
            style={{
              fontSize: spec.metaSize,
              color: "var(--card-rainbow-text-dim)",
              textAlign: "center",
              padding: "0 4px",
              fontStyle: "italic",
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={content.subtitle}
          >
            {content.subtitle}
          </div>
        )}

        <CardImage
          path={content.image}
          crop={content.crop}
          extend={content.extend}
          height={spec.imageHeight}
          borderRadius={spec.borderRadius - 3}
          border={`2px solid ${borderSoft}`}
          background="var(--card-rainbow-panel)"
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.4,
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                backgroundImage: RAINBOW_GRADIENT,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                letterSpacing: 2,
                userSelect: "none",
              }}
            >
              {content.title.slice(0, 2) || "?"}
            </div>
          }
        />

        {stars && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              fontSize: spec.metaSize,
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            {content.levelLabel && (
              <span
                style={{
                  color: "var(--card-rainbow-text-dim)",
                  fontStyle: "italic",
                  fontSize: spec.metaSize,
                }}
              >
                {content.levelLabel}
              </span>
            )}
            <span
              style={{
                letterSpacing: -1,
                backgroundImage: RAINBOW_GRADIENT,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              {stars}
            </span>
          </div>
        )}

        <div
          style={{
            fontSize: spec.typeSize,
            textAlign: "center",
            color: "var(--card-rainbow-text-dim)",
            padding: "1px 0",
            borderTop: `2px solid ${borderSoft}`,
            borderBottom: `2px solid ${borderSoft}`,
            fontStyle: "italic",
            letterSpacing: 0.3,
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={content.typeLine}
        >
          {content.typeLine}
        </div>

        <div
          title={displayBody}
          style={{
            flex: 1,
            minHeight: 0,
            background: "var(--card-rainbow-panel)",
            border: `1px solid ${borderSoft}`,
            borderRadius: 3,
            padding: `${spec.padding}px ${spec.padding + 2}px`,
            fontSize: spec.bodySize,
            lineHeight: 1.35,
            color: "var(--card-rainbow-text)",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            position: "relative",
          }}
        >
          {displayBody}

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 18,
              background:
                "linear-gradient(180deg, transparent 0%, var(--card-rainbow-panel) 100%)",
              pointerEvents: "none",
            }}
          />

          {hasStats && (
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 2,
                display: "flex",
                gap: 8,
                fontSize: spec.statSize,
                fontWeight: 700,
                color: "var(--card-rainbow-text)",
                background: "var(--card-rainbow-panel)",
                padding: "0 4px",
                borderRadius: 2,
              }}
            >
              {content.atk !== undefined && (
                <span>
                  {content.atkLabel ?? "ATK"}/{content.atk}
                </span>
              )}
              {content.def !== undefined && (
                <span>
                  {content.defLabel ?? "DEF"}/{content.def}
                </span>
              )}
              {content.hp !== undefined && (
                <span>
                  {content.hpLabel ?? "HP"}/{content.hp}
                </span>
              )}
            </div>
          )}
        </div>
      </CardInner>
    </CardShell>
  );
}

export default {
  id: "rainbow",
  label: "彩虹",
  Component: CardFrameRainbow,
} satisfies CardStyleDef;
