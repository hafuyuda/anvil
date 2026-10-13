import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardShell } from "../../primitives/CardShell";
import { readText, readStat, readBody } from "../slotUtils";

const MINIMAL_SLOTS: SlotDef[] = [
  {
    key: "title",
    kind: "text",
    label: "标题字段（留空用卡名）",
    defaultSource: "name",
  },
  { key: "subtitle", kind: "text", label: "副标题" },
  { key: "type_line", kind: "text", label: "类型行（留空用类型名）" },
  { key: "level", kind: "stat", label: "等级字段", defaultStatLabel: "Lv" },
  { key: "atk", kind: "stat", label: "攻击字段", defaultStatLabel: "ATK" },
  { key: "def", kind: "stat", label: "防御字段", defaultStatLabel: "DEF" },
  { key: "hp", kind: "stat", label: "HP 字段", defaultStatLabel: "HP" },
  { key: "body", kind: "body", label: "正文字段（可多选，按选择顺序显示）" },
];

export function CardFrameMinimal({
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
  const level = readStat(content.slots.level);
  const atk = readStat(content.slots.atk);
  const def = readStat(content.slots.def);
  const hp = readStat(content.slots.hp);
  const bodyLines = readBody(content.slots.body);
  const displayBody =
    bodyLines.length > 0 ? bodyLines.join("\n") : (cardType.description ?? "");

  const accentLine = `color-mix(in srgb, ${accent} 55%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 25%, transparent)`;

  const hasStats = atk !== null || def !== null || hp !== null;

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
        title={title}
      >
        {title}
      </div>

      {subtitle && (
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
          title={subtitle}
        >
          {subtitle}
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
        title={typeLine}
      >
        {cardType.icon ? `${cardType.icon} ` : ""}
        {typeLine}
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

      {(hasStats || level !== null) && (
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
            {level !== null &&
              `${level.label ? `${level.label} ` : "Lv "}${level.value}`}
          </span>
          <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {atk !== null && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {atk.label ?? "ATK"}
                </span>{" "}
                {atk.value}
              </span>
            )}
            {def !== null && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {def.label ?? "DEF"}
                </span>{" "}
                {def.value}
              </span>
            )}
            {hp !== null && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {hp.label ?? "HP"}
                </span>{" "}
                {hp.value}
              </span>
            )}
          </span>
        </div>
      )}
    </CardShell>
  );
}

export default {
  id: "minimal",
  label: "极简",
  Component: CardFrameMinimal,
  slots: MINIMAL_SLOTS,
} satisfies CardStyleDef;
