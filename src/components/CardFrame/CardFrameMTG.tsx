import type { Card, CardType } from "../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "./types";
import { mapCard } from "./mapping";
import { CardImage } from "./CardImage";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 万智牌风格。
 * 深色石质外框 + 顶部标题条 + 中段艺术图 + 底部羊皮纸文字栏。
 */
export function CardFrameMTG({
  card,
  cardType,
  size = "medium",
  selected = false,
  onClick,
}: Props) {
  const spec = SIZE_MAP[size];
  const m = mapCard(card, cardType);
  const accent = cardType.color ?? "var(--card-frame-default-accent)";

  const displayBody = m.body.length > 0 ? m.body : (cardType.description ?? "");
  const accentSoft = `color-mix(in srgb, ${accent} 40%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 65%, transparent)`;
  const titleBarBg = `linear-gradient(180deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, #000) 100%)`;

  const hasStats =
    m.atk !== undefined || m.def !== undefined || m.hp !== undefined;

  // MTG 右上角是费用/等级，用星号填充
  const pips = m.level ? Math.min(m.level, 8) : 0;

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        padding: 4,
        boxSizing: "border-box",
        background:
          "linear-gradient(145deg, var(--card-mtg-outer-1) 0%, var(--card-mtg-outer-2) 100%)",
        boxShadow: selected
          ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, var(--card-mtg-shadow-selected)`
          : "var(--card-mtg-shadow)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: spec.borderRadius - 2,
          background: "var(--card-mtg-bg)",
          border: `1px solid var(--card-mtg-inner-border)`,
          padding: spec.padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* 顶部标题条 */}
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
            title={m.title}
          >
            {m.title}
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
              title={`${m.levelLabel ?? "等级"} ${m.level}`}
            >
              {"●".repeat(pips)}
            </span>
          )}
        </div>

        {/* 类型行 */}
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
          title={m.typeLine}
        >
          {m.typeLine}
        </div>

        {/* 艺术图 */}
        <CardImage
          path={m.image}
          crop={m.crop}
          extend={m.extend}
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
              {m.title.slice(0, 2) || "?"}
            </div>
          }
        />
        {/* 底部文字栏 */}
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
              {m.atk !== undefined && (
                <span>
                  {m.atkLabel ?? "ATK"}/{m.atk}
                </span>
              )}
              {m.def !== undefined && (
                <span>
                  {m.defLabel ?? "DEF"}/{m.def}
                </span>
              )}
              {m.hp !== undefined && (
                <span>
                  {m.hpLabel ?? "HP"}/{m.hp}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
