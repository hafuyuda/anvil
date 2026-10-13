import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

const MTG_SLOTS: SlotDef[] = [
  {
    key: "title",
    kind: "text",
    label: "标题字段（留空用卡名）",
    defaultSource: "name",
  },
  { key: "image", kind: "image", label: "图像字段" },
  { key: "type_line", kind: "text", label: "类型行（留空用类型名）" },
  { key: "level", kind: "stat", label: "等级字段", defaultStatLabel: "等级" },
  { key: "atk", kind: "stat", label: "攻击字段", defaultStatLabel: "ATK" },
  { key: "def", kind: "stat", label: "防御字段", defaultStatLabel: "DEF" },
  { key: "hp", kind: "stat", label: "HP 字段", defaultStatLabel: "HP" },
  { key: "body", kind: "body", label: "正文字段（可多选，按选择顺序显示）" },
];

export function CardFrameMTG({
  cardType,
  size = "medium",
  content,
  selected = false,
  onClick,
}: CardStyleProps) {
  const spec = SIZE_MAP[size];
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const title = readText(content.slots.title);
  const typeLine = readText(content.slots.type_line);
  const image = readImage(content.slots.image);
  const level = readStat(content.slots.level);
  const atk = readStat(content.slots.atk);
  const def = readStat(content.slots.def);
  const hp = readStat(content.slots.hp);
  const bodyLines = readBody(content.slots.body);
  const displayBody =
    bodyLines.length > 0 ? bodyLines.join("\n") : (cardType.description ?? "");

  const accentSoft = `color-mix(in srgb, ${accent} 40%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 65%, transparent)`;
  const titleBarBg = `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #000) 100%)`;

  const hasStats = atk !== null || def !== null || hp !== null;
  const pips = level ? Math.min(level.value, 8) : 0;

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
            title={title}
          >
            {title}
          </span>
          {pips > 0 && level && (
            <span
              style={{
                fontSize: spec.metaSize,
                color: "#fff",
                textShadow: "0 1px 1px rgba(0,0,0,0.6)",
                flexShrink: 0,
                marginLeft: 4,
                letterSpacing: -1,
              }}
              title={`${level.label ?? "等级"} ${level.value}`}
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
          title={typeLine}
        >
          {typeLine}
        </div>

        <CardImage
          path={image}
          crop={content.crop}
          extend={content.extend}
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
              {title.slice(0, 2) || "?"}
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
  id: "mtg",
  label: "万智牌",
  Component: CardFrameMTG,
  slots: MTG_SLOTS,
} satisfies CardStyleDef;
