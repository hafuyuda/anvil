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

export function CardFramePokemon({
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

  const accentSoft = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 70%, #000)`;
  const titleBarBg = `linear-gradient(180deg, color-mix(in srgb, ${accent} 85%, #fff) 0%, ${accent} 100%)`;

  const hpText =
    content.hp !== undefined
      ? `${content.hpLabel ?? "HP"} ${content.hp}`
      : null;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius + 2}
      padding={4}
      background="linear-gradient(160deg, var(--card-pokemon-outer-1) 0%, var(--card-pokemon-outer-2) 100%)"
      shadow="var(--card-pokemon-shadow)"
      shadowSelected="var(--card-pokemon-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius}
        padding={spec.padding}
        background="var(--card-pokemon-bg)"
        border="1px solid var(--card-pokemon-inner-border)"
        gap={spec.padding / 2}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize + 1,
              fontWeight: 700,
              color: "var(--card-pokemon-title)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-title)",
              flex: 1,
            }}
            title={content.title}
          >
            {content.title}
          </span>
          {hpText && (
            <span
              style={{
                fontSize: spec.statSize,
                fontWeight: 700,
                color: "var(--card-pokemon-hp)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {hpText}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            padding: "2px 6px",
            background: titleBarBg,
            borderRadius: 3,
            border: `1px solid ${accentStrong}`,
            fontSize: spec.typeSize,
            color: "#fff",
            textShadow: "0 1px 1px rgba(0,0,0,0.35)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              fontStyle: content.subtitle ? "normal" : "italic",
            }}
            title={content.subtitle ?? content.typeLine}
          >
            {content.subtitle ?? content.typeLine}
          </span>
          {content.level !== undefined && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
              }}
              title={content.levelLabel}
            >
              {content.levelLabel ? `${content.levelLabel} ` : "Lv "}
              {content.level}
            </span>
          )}
        </div>

        <CardImage
          path={content.image}
          crop={features.crop}
          extend={features.extend}
          height={spec.imageHeight}
          borderRadius={3}
          border={`2px solid ${accentSoft}`}
          background={`linear-gradient(180deg, color-mix(in srgb, ${accent} 25%, var(--card-pokemon-art-bg)) 0%, color-mix(in srgb, ${accent} 10%, var(--card-pokemon-art-bg)) 100%)`}
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.6,
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
            fontSize: spec.bodySize,
            lineHeight: 1.45,
            color: "var(--card-pokemon-text)",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            position: "relative",
            paddingBottom:
              content.atk !== undefined || content.def !== undefined
                ? spec.statSize + 2
                : 0,
          }}
          title={displayBody}
        >
          {displayBody}

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 14,
              background: `linear-gradient(180deg, transparent 0%, var(--card-pokemon-bg) 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>

        {(content.atk !== undefined || content.def !== undefined) && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              fontSize: spec.statSize,
              fontWeight: 700,
              color: "var(--card-pokemon-text)",
              fontFamily: "var(--font-mono)",
              padding: "2px 4px",
              borderTop: `1px solid ${accentSoft}`,
            }}
          >
            {content.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-pokemon-text-dim)" }}>
                  {content.atkLabel ?? "ATK"}
                </span>{" "}
                {content.atk}
              </span>
            )}
            {content.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-pokemon-text-dim)" }}>
                  {content.defLabel ?? "DEF"}
                </span>{" "}
                {content.def}
              </span>
            )}
          </div>
        )}
      </CardInner>
    </CardShell>
  );
}
