import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

const RAINBOW_GRADIENT =
  "linear-gradient(135deg, var(--card-rainbow-1) 0%, var(--card-rainbow-2) 18%, var(--card-rainbow-3) 36%, var(--card-rainbow-4) 54%, var(--card-rainbow-5) 72%, var(--card-rainbow-6) 86%, var(--card-rainbow-7) 100%)";

const RAINBOW_SLOTS: SlotDef[] = [
  {
    key: "title",
    kind: "text",
    label: "标题字段（留空用卡名）",
    defaultSource: "name",
  },
  { key: "subtitle", kind: "text", label: "副标题" },
  { key: "image", kind: "image", label: "图像字段" },
  { key: "level", kind: "stat", label: "等级字段", defaultStatLabel: "★" },
  { key: "type_line", kind: "text", label: "类型行（留空用类型名）" },
  { key: "atk", kind: "stat", label: "攻击字段", defaultStatLabel: "ATK" },
  { key: "def", kind: "stat", label: "防御字段", defaultStatLabel: "DEF" },
  { key: "hp", kind: "stat", label: "HP 字段", defaultStatLabel: "HP" },
  { key: "body", kind: "body", label: "正文字段（可多选，按选择顺序显示）" },
];

export function CardFrameRainbow({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const title = readText(content.slots.title);
  const subtitle = readText(content.slots.subtitle);
  const typeLine = readText(content.slots.type_line);
  const image = readImage(content.slots.image);
  const level = readStat(content.slots.level);
  const atk = readStat(content.slots.atk);
  const def = readStat(content.slots.def);
  const hp = readStat(content.slots.hp);
  const bodyLines = readBody(content.slots.body);
  const displayBody =
    bodyLines.length > 0 ? bodyLines.join("\n") : (cardType.description ?? "");

  const borderSoft = `color-mix(in srgb, ${accent} 35%, transparent)`;
  const stars = level ? "★".repeat(Math.min(level.value, 12)) : "";

  const hasStats = atk !== null || def !== null || hp !== null;

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
            title={title}
          >
            {title}
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

        {subtitle && (
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
            title={subtitle}
          >
            {subtitle}
          </div>
        )}

        <CardImage
          path={image}
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
              {title.slice(0, 2) || "?"}
            </div>
          }
        />

        {stars && level && (
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
            {level.label && (
              <span
                style={{
                  color: "var(--card-rainbow-text-dim)",
                  fontStyle: "italic",
                  fontSize: spec.metaSize,
                }}
              >
                {level.label}
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
          title={typeLine}
        >
          {typeLine}
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
              {atk !== null && (
                <span>
                  {atk.label ?? "ATK"}/{atk.value}
                </span>
              )}
              {def !== null && (
                <span>
                  {def.label ?? "DEF"}/{def.value}
                </span>
              )}
              {hp !== null && (
                <span>
                  {hp.label ?? "HP"}/{hp.value}
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
  slots: RAINBOW_SLOTS,
} satisfies CardStyleDef;
