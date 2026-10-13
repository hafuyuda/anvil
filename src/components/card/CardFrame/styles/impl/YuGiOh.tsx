import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

const YUGIOH_SLOTS: SlotDef[] = [
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

export function CardFrameYuGiOh({
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
  const stars = level ? "★".repeat(Math.min(level.value, 12)) : "";

  const accentSoft = `color-mix(in srgb, ${accent} 40%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 55%, transparent)`;
  const accentTitleTop = accent;
  const accentTitleBottom = shade(accent, 80);
  const accentTitleBorder = shade(accent, 70);

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={3}
      background={`linear-gradient(145deg, var(--card-yugioh-outer-1) 0%, var(--card-yugioh-outer-2) 50%, var(--card-yugioh-outer-3) 100%)`}
      shadow="var(--card-yugioh-shadow)"
      shadowSelected="var(--card-yugioh-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
    >
      <CardInner
        borderRadius={spec.borderRadius - 2}
        padding={spec.padding}
        background={`linear-gradient(180deg, var(--card-yugioh-inner-bg-1) 0%, var(--card-yugioh-inner-bg-2) 100%)`}
        border={`1px solid ${accent}`}
        gap={spec.padding / 2}
      >
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
            title={title}
          >
            {title}
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

        {subtitle && (
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
              {title.slice(0, 2) || "?"}
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
              color: "var(--card-yugioh-star)",
              padding: "0 4px",
              textShadow: "0 0 1px #fff",
              flexShrink: 0,
            }}
          >
            {level?.label && (
              <span
                style={{
                  color: "var(--card-yugioh-text-dim)",
                  fontStyle: "italic",
                  fontSize: spec.metaSize,
                }}
              >
                {level.label}
              </span>
            )}
            <span style={{ letterSpacing: -1 }}>{stars}</span>
          </div>
        )}

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
          title={typeLine}
        >
          {typeLine}
        </div>

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

          {(atk !== null || def !== null || hp !== null) && (
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

function shade(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, #000)`;
}

export default {
  id: "yugioh",
  label: "游戏王",
  Component: CardFrameYuGiOh,
  slots: YUGIOH_SLOTS,
} satisfies CardStyleDef;
