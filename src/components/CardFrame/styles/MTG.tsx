import type { CardType } from "../../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "../types";
import type { CardContent, CardFeatures } from "../mapping";
import { CardImage } from "../primitives/CardImage";
import { CardShell } from "../primitives/CardShell";
import { CardInner } from "../primitives/CardInner";

interface Props {
  cardType: CardType;
  size?: CardFrameSize;
  content: CardContent;
  features: CardFeatures;
  selected?: boolean;
  onClick?: () => void;
}

export function CardFrameMTG({
  cardType,
  size = "medium",
  content,
  features,
  selected = false,
  onClick,
}: Props) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const displayBody =
    content.body.length > 0 ? content.body : (cardType.description ?? "");

  const accentSoft = `color-mix(in srgb, ${accent} 40%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 65%, transparent)`;
  const titleBarBg = `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #000) 100%)`;

  const hasStats =
    content.atk !== undefined ||
    content.def !== undefined ||
    content.hp !== undefined;

  const pips = content.level ? Math.min(content.level, 8) : 0;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={4}
      background="linear-gradient(145deg, var(--card-mtg-outer-1) 0%, var(--card-mtg-outer-2) 100%)"
      shadow="var(--card-mtg-shadow)"
      shadowSelected="var(--card-mtg-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius - 2}
        padding={spec.padding}
        background="var(--card-mtg-bg)"
        border="1px solid var(--card-mtg-inner-border)"
        gap={4}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "3px 8px",
            flexShrink: 0,
            background: titleBarBg,
            borderRadius: 3,
            border: `1px solid color-mix(in srgb, ${accent} 55%, #000)`,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize,
              fontWeight: 700,
              color: "#fff",
              textShadow: "0 1px 1px rgba(0,0,0,0.6)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-title)",
              letterSpacing: 0.3,
            }}
            title={content.title}
          >
            {content.title}
          </span>
          {pips > 0 && (
            <span
              style={{
                fontSize: spec.metaSize,
                color: "#fff",
                textShadow: "0 1px 1px rgba(0,0,0,0.6)",
                flexShrink: 0,
                marginLeft: 4,
                letterSpacing: -1,
              }}
              title={`${content.levelLabel ?? "等级"} ${content.level}`}
            >
              {"●".repeat(pips)}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: spec.typeSize,
            color: "var(--card-mtg-text-dim)",
            padding: "0 2px",
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={content.typeLine}
        >
          {content.typeLine}
        </div>

        <CardImage
          path={content.image}
          crop={features.crop}
          extend={features.extend}
          height={spec.imageHeight}
          borderRadius={2}
          border={`1px solid ${accentSoft}`}
          background={`color-mix(in srgb, ${accent} 18%, var(--card-mtg-art-bg))`}
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.4,
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                color: accentStrong,
                letterSpacing: 3,
                userSelect: "none",
              }}
            >
              {content.title.slice(0, 2) || "?"}
            </div>
          }
        />

        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: "var(--card-mtg-parchment)",
            border: `1px solid var(--card-mtg-parchment-border)`,
            borderRadius: 2,
            padding: `${spec.padding - 1}px ${spec.padding}px`,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              fontSize: spec.bodySize,
              lineHeight: 1.4,
              color: "var(--card-mtg-text)",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              paddingBottom: hasStats ? spec.statSize + 2 : 0,
            }}
            title={displayBody}
          >
            {displayBody}
          </div>

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
                color: "var(--card-mtg-text)",
                fontFamily: "var(--font-mono)",
                background: "var(--card-mtg-parchment)",
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
