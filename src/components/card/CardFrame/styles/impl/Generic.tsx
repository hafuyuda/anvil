import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

const GENERIC_SLOTS: SlotDef[] = [
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

export function CardFrameGeneric({
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

  const accentLine = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 18%, transparent)`;
  const titleBarBg = `color-mix(in srgb, ${accent} 22%, var(--card-generic-bg))`;

  const hasStats = atk !== null || def !== null || hp !== null;

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
            title={title}
          >
            {title}
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

        {subtitle && (
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
              {title.slice(0, 2) || "?"}
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
            title={typeLine}
          >
            {typeLine}
          </span>
          {level !== null && (
            <span
              style={{
                color: "var(--card-generic-text)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
              title={level.label ?? undefined}
            >
              {level.label ? `${level.label} ` : ""}
              {level.value}
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
            {atk !== null && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {atk.label ?? "ATK"}
                </span>{" "}
                {atk.value}
              </span>
            )}
            {def !== null && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {def.label ?? "DEF"}
                </span>{" "}
                {def.value}
              </span>
            )}
            {hp !== null && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {hp.label ?? "HP"}
                </span>{" "}
                {hp.value}
              </span>
            )}
          </div>
        )}
      </CardInner>
    </CardShell>
  );
}

export default {
  id: "generic",
  label: "通用",
  Component: CardFrameGeneric,
  slots: GENERIC_SLOTS,
} satisfies CardStyleDef;
