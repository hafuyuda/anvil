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

export function CardFrameGeneric({
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

  const accentLine = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 18%, transparent)`;
  const titleBarBg = `color-mix(in srgb, ${accent} 22%, var(--card-generic-bg))`;

  const hasStats =
    content.atk !== undefined ||
    content.def !== undefined ||
    content.hp !== undefined;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={3}
      background="var(--card-generic-outer)"
      border={`1px solid ${accentLine}`}
      shadow="var(--card-generic-shadow)"
      shadowSelected="var(--card-generic-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius - 2}
        padding={spec.padding}
        background="var(--card-generic-bg)"
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
            background: titleBarBg,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 2,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize,
              fontWeight: 700,
              color: "var(--card-generic-title)",
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
              color: accent,
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
              color: "var(--card-generic-text-dim)",
              padding: "0 2px",
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
          crop={features.crop}
          extend={features.extend}
          height={spec.imageHeight}
          borderRadius={3}
          border={`1px solid ${accentSoft}`}
          background={`color-mix(in srgb, ${accent} 10%, var(--card-generic-bg))`}
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.2,
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                color: accentLine,
                letterSpacing: 2,
                userSelect: "none",
              }}
            >
              {content.title.slice(0, 2) || "?"}
            </div>
          }
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            fontSize: spec.typeSize,
            color: "var(--card-generic-text-dim)",
            padding: "2px 2px",
            borderTop: `1px solid ${accentSoft}`,
            borderBottom: `1px solid ${accentSoft}`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
            title={content.typeLine}
          >
            {content.typeLine}
          </span>
          {content.level !== undefined && (
            <span
              style={{
                color: "var(--card-generic-text)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
              title={content.levelLabel}
            >
              {content.levelLabel ? `${content.levelLabel} ` : ""}
              {content.level}
            </span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            fontSize: spec.bodySize,
            lineHeight: 1.4,
            color: "var(--card-generic-text)",
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            position: "relative",
            paddingBottom: hasStats ? spec.statSize + 4 : 0,
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
              height: 16,
              background: `linear-gradient(180deg, transparent 0%, var(--card-generic-bg) 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>

        {hasStats && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              fontSize: spec.statSize,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "var(--card-generic-text)",
              padding: "2px 4px",
              borderTop: `1px solid ${accentSoft}`,
            }}
          >
            {content.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {content.atkLabel ?? "ATK"}
                </span>{" "}
                {content.atk}
              </span>
            )}
            {content.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {content.defLabel ?? "DEF"}
                </span>{" "}
                {content.def}
              </span>
            )}
            {content.hp !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {content.hpLabel ?? "HP"}
                </span>{" "}
                {content.hp}
              </span>
            )}
          </div>
        )}
      </CardInner>
    </CardShell>
  );
}
