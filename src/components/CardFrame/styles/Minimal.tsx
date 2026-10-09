import type { CardType } from "../../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "../types";
import type { CardContent, CardFeatures } from "../mapping";
import { CardShell } from "../primitives/CardShell";

interface Props {
  cardType: CardType;
  size?: CardFrameSize;
  content: CardContent;
  features: CardFeatures;
  selected?: boolean;
  onClick?: () => void;
}

export function CardFrameMinimal({
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

  const accentLine = `color-mix(in srgb, ${accent} 55%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 25%, transparent)`;

  const hasStats =
    content.atk !== undefined ||
    content.def !== undefined ||
    content.hp !== undefined;

  // minimal 无图像区，features 未使用，但保留在 props 里统一接口
  void features;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={spec.padding + 4}
      background="var(--card-minimal-bg)"
      border={`1px solid ${accentSoft}`}
      borderLeft={`3px solid ${accentLine}`}
      shadow="var(--card-minimal-shadow)"
      shadowSelected="var(--card-minimal-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          fontSize: spec.titleSize + 1,
          fontWeight: 600,
          color: "var(--card-minimal-title)",
          fontFamily: "var(--font-title)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
          letterSpacing: 0.3,
        }}
        title={content.title}
      >
        {content.title}
      </div>

      {content.subtitle && (
        <div
          style={{
            fontSize: spec.metaSize,
            color: "var(--card-minimal-text-dim)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontStyle: "italic",
          }}
          title={content.subtitle}
        >
          {content.subtitle}
        </div>
      )}

      <div
        style={{
          fontSize: spec.typeSize,
          color: accent,
          marginTop: 4,
          paddingBottom: 4,
          borderBottom: `1px solid ${accentSoft}`,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
        }}
        title={content.typeLine}
      >
        {cardType.icon ? `${cardType.icon} ` : ""}
        {content.typeLine}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: 8,
          fontSize: spec.bodySize + 1,
          lineHeight: 1.6,
          color: "var(--card-minimal-text)",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          position: "relative",
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
            background: `linear-gradient(180deg, transparent 0%, var(--card-minimal-bg) 100%)`,
            pointerEvents: "none",
          }}
        />
      </div>

      {(hasStats || content.level !== undefined) && (
        <div
          style={{
            flexShrink: 0,
            marginTop: 6,
            paddingTop: 5,
            borderTop: `1px solid ${accentSoft}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            fontSize: spec.statSize,
            fontFamily: "var(--font-mono)",
            color: "var(--card-minimal-text)",
          }}
        >
          <span
            style={{
              color: "var(--card-minimal-text-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {content.level !== undefined &&
              `${content.levelLabel ? `${content.levelLabel} ` : "Lv "}${content.level}`}
          </span>
          <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {content.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {content.atkLabel ?? "ATK"}
                </span>{" "}
                {content.atk}
              </span>
            )}
            {content.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {content.defLabel ?? "DEF"}
                </span>{" "}
                {content.def}
              </span>
            )}
            {content.hp !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {content.hpLabel ?? "HP"}
                </span>{" "}
                {content.hp}
              </span>
            )}
          </span>
        </div>
      )}
    </CardShell>
  );
}
