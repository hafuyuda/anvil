import type { CSSProperties } from "react";
import { SIZE_MAP } from "../../types";
import type { CardStyleDef, CardStyleProps, SlotDef } from "../types";
import { CardImage } from "../../primitives/CardImage";
import { CardShell } from "../../primitives/CardShell";
import { CardInner } from "../../primitives/CardInner";
import { readText, readStat, readBody, readImage } from "../slotUtils";

/**
 * 铁砧（anvil）卡框：矮人锻造 TCG 卡框。
 *
 * 融合策略：以 yugioh / mtg 的「金属外框 + 羊皮纸文字框」TCG 骨架为结构母本
 * （保留原型卡牌的视觉语言与设计体系），再覆以矮人锻造材质作为皮肤：
 *   铁 —— 锻铁外框、四角铆钉、铁制标题板
 *   木 —— 内层暗木/石底纹（极淡，仅破平涂）
 *   锤/火 —— 炉火强调色（--accent-ember）、锻金星级、标题板炉火下沿
 *   纹章 —— 羊皮纸框金线规、铁板铭文式标题
 *
 * 与 yugioh 的差异只发生在「材质与配色」，结构分区、槽位、基础构件、
 * 选中环公式完全一致，因此仍是同一设计体系内的成员。
 */

const ANVIL_SLOTS: SlotDef[] = [
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

/** 四角铆钉：锚定到外框（CardShell 需 position:relative） */
function Rivets({ size }: { size: "small" | "medium" | "large" }) {
  const r = size === "small" ? 4 : size === "large" ? 7 : 5;
  const off = size === "small" ? 4 : 6;
  const base: CSSProperties = {
    position: "absolute",
    width: r,
    height: r,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 35% 32%, var(--card-anvil-rivet-1) 0%, var(--card-anvil-rivet-2) 55%, var(--card-anvil-rivet-3) 100%)",
    boxShadow: "0 1px 1px rgba(0,0,0,0.6)",
    pointerEvents: "none",
    zIndex: 2,
  };
  return (
    <>
      <span style={{ ...base, top: off, left: off }} />
      <span style={{ ...base, top: off, right: off }} />
      <span style={{ ...base, bottom: off, left: off }} />
      <span style={{ ...base, bottom: off, right: off }} />
    </>
  );
}

export function CardFrameAnvil({
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

  // 类型色派生（与原型一致：卡类型色透出卡框边饰），与锻铁实色混，不透明
  const accentSoft = `color-mix(in srgb, ${accent} 30%, var(--card-anvil-inner-border))`;
  const accentStrong = `color-mix(in srgb, ${accent} 55%, var(--card-anvil-art-border))`;
  // 锻造边：铁框里掺一点卡类型色（保留原型「类型色透出」特性）
  const artBorder = `1px solid ${accentStrong}`;

  const hasStats = atk !== null || def !== null || hp !== null;

  return (
    <CardShell
      width={spec.w}
      height={spec.h}
      borderRadius={spec.borderRadius}
      padding={3}
      background={`linear-gradient(145deg, var(--card-anvil-frame-1) 0%, var(--card-anvil-frame-2) 50%, var(--card-anvil-frame-3) 100%)`}
      shadow="var(--card-anvil-shadow)"
      shadowSelected="var(--card-anvil-shadow-selected)"
      accent={accent}
      selected={selected}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      <Rivets size={size} />

      <CardInner
        borderRadius={spec.borderRadius - 2}
        padding={spec.padding}
        background={`linear-gradient(180deg, var(--card-anvil-inner-bg-1) 0%, var(--card-anvil-inner-bg-2) 100%), var(--tex-wood)`}
        border={`1px solid var(--card-anvil-inner-border)`}
        gap={spec.padding / 2}
      >
        {/* 标题铁板：铭文式，炉火下沿 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 6px",
            flexShrink: 0,
            background:
              "linear-gradient(180deg, var(--card-anvil-title-bg-1) 0%, var(--card-anvil-title-bg-2) 100%)",
            borderRadius: 3,
            border: `1px solid var(--card-anvil-title-border)`,
            borderBottom: `2px solid color-mix(in srgb, var(--card-anvil-ember) 50%, ${accentSoft})`,
          }}
        >
          <span
            style={{
              fontSize: spec.titleSize,
              fontWeight: 700,
              color: "var(--card-anvil-title-text)",
              textShadow: "0 1px 0 rgba(0,0,0,0.5)",
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
          <span
            style={{
              fontSize: spec.metaSize,
              color: "var(--card-anvil-ember)",
              textShadow: "0 0 4px color-mix(in srgb, var(--card-anvil-ember) 70%, transparent)",
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
              color: "var(--card-anvil-text-dim)",
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

        {/* 艺术窗：铁框 + 暗火底 */}
        <CardImage
          path={image}
          crop={content.crop}
          height={spec.imageHeight}
          borderRadius={spec.borderRadius - 3}
          border={artBorder}
          background="var(--card-anvil-art-bg)"
          fallback={
            <div
              style={{
                fontSize: spec.titleSize * 2.4,
                fontFamily: "var(--font-title)",
                fontWeight: 700,
                color: "var(--card-anvil-rivet-2)",
                textShadow: "0 1px 0 rgba(0,0,0,0.5)",
                letterSpacing: 2,
                userSelect: "none",
              }}
            >
              {title.slice(0, 2) || "?"}
            </div>
          }
        />

        {/* 星级：原型机制保留，锻金＋炉火辉光上色 */}
        {stars && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              fontSize: spec.metaSize,
              color: "var(--card-anvil-star)",
              textShadow:
                "0 0 3px color-mix(in srgb, var(--card-anvil-ember) 45%, transparent)",
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            {level?.label && (
              <span
                style={{
                  color: "var(--card-anvil-text-dim)",
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

        {/* 类型分隔线：锻造金属规（保留原型的 engraved divider 概念） */}
        <div
          style={{
            fontSize: spec.typeSize,
            textAlign: "center",
            color: "var(--card-anvil-text-dim)",
            padding: "1px 0",
            borderTop: `1px solid var(--card-anvil-inner-border)`,
            borderBottom: `1px solid var(--card-anvil-inner-border)`,
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

        {/* 羊皮纸文字框：保留原型 TCG 文字框，加金线规（纹章） */}
        <div
          title={displayBody}
          style={{
            flex: 1,
            minHeight: 0,
            background: "var(--card-anvil-parchment)",
            border: `1px solid var(--card-anvil-parchment-border)`,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            borderRadius: 3,
            padding: `${spec.padding}px ${spec.padding + 2}px`,
            fontSize: spec.bodySize,
            lineHeight: 1.3,
            color: "var(--card-anvil-text)",
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
              background:
                "linear-gradient(180deg, transparent 0%, var(--card-anvil-parchment) 100%)",
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
                color: "var(--card-anvil-text)",
                background: "var(--card-anvil-parchment)",
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
  id: "anvil",
  label: "铁砧锻造",
  Component: CardFrameAnvil,
  slots: ANVIL_SLOTS,
} satisfies CardStyleDef;
