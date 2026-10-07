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
 * 宝可梦风格。
 * 浅色底 + 顶部标题条 + 艺术图 + 类型图标行 + 正文 + 右下 HP/等级。
 */
export function CardFramePokemon({
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

  const accentSoft = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const accentStrong = `color-mix(in srgb, ${accent} 70%, #000)`;
  const titleBarBg = `linear-gradient(180deg, color-mix(in srgb, ${accent} 85%, #fff) 0%, ${accent} 100%)`;

  // 宝可梦风格：右上角显示 HP
  const hpText = m.hp !== undefined ? `${m.hpLabel ?? "HP"} ${m.hp}` : null;

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius + 2,
        padding: 4,
        boxSizing: "border-box",
        background: `linear-gradient(160deg, var(--card-pokemon-outer-1) 0%, var(--card-pokemon-outer-2) 100%)`,
        boxShadow: selected
          ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, var(--card-pokemon-shadow-selected)`
          : "var(--card-pokemon-shadow)",
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
          borderRadius: spec.borderRadius,
          background: "var(--card-pokemon-bg)",
          padding: spec.padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: spec.padding / 2,
          overflow: "hidden",
          border: `1px solid var(--card-pokemon-inner-border)`,
        }}
      >
        {/* 顶部：标题 + HP */}
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
            title={m.title}
          >
            {m.title}
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

        {/* 副标题 / 类型条 */}
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
              fontStyle: m.subtitle ? "normal" : "italic",
            }}
            title={m.subtitle ?? m.typeLine}
          >
            {m.subtitle ?? m.typeLine}
          </span>
          {m.level !== undefined && (
            <span
              style={{
                flexShrink: 0,
                fontFamily: "var(--font-mono)",
              }}
              title={m.levelLabel}
            >
              {m.levelLabel ? `${m.levelLabel} ` : "Lv "}
              {m.level}
            </span>
          )}
        </div>

        {/* 艺术图 */}
        <CardImage
          path={m.image}
          crop={m.crop}
          extend={m.extend}
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
              {m.title.slice(0, 2) || "?"}
            </div>
          }
        />

        {/* 正文 */}
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
              m.atk !== undefined || m.def !== undefined
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

        {/* 底部 ATK / DEF */}
        {(m.atk !== undefined || m.def !== undefined) && (
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
            {m.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-pokemon-text-dim)" }}>
                  {m.atkLabel ?? "ATK"}
                </span>{" "}
                {m.atk}
              </span>
            )}
            {m.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-pokemon-text-dim)" }}>
                  {m.defLabel ?? "DEF"}
                </span>{" "}
                {m.def}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
