import type { Card, CardType } from "../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "./types";
import { mapCard } from "./mapping";
import { useImageUrl } from "../../hooks/useImageUrl";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 中性「数据卡」风格。
 * 无色金属质感，深色底 + 强调色细描边，偏功能展示。
 */
export function CardFrameGeneric({
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
  const imageUrl = useImageUrl(m.image);

  const accentLine = `color-mix(in srgb, ${accent} 45%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 18%, transparent)`;
  const titleBarBg = `color-mix(in srgb, ${accent} 22%, var(--card-generic-bg))`;

  const hasStats =
    m.atk !== undefined || m.def !== undefined || m.hp !== undefined;

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        padding: 3,
        boxSizing: "border-box",
        background: "var(--card-generic-outer)",
        border: `1px solid ${accentLine}`,
        boxShadow: selected
          ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, var(--card-generic-shadow-selected)`
          : "var(--card-generic-shadow)",
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
          background: "var(--card-generic-bg)",
          padding: spec.padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: spec.padding / 2,
          overflow: "hidden",
          position: "relative",
        }}
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
            title={m.title}
          >
            {m.title}
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

        {/* 副标题 */}
        {m.subtitle && (
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
            title={m.subtitle}
          >
            {m.subtitle}
          </div>
        )}

        {/* 图像区 */}
        <div
          style={{
            height: spec.imageHeight,
            flexShrink: 0,
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${accentSoft}`,
            background: `color-mix(in srgb, ${accent} 10%, var(--card-generic-bg))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                userSelect: "none",
              }}
            />
          ) : (
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
              {m.title.slice(0, 2) || "?"}
            </div>
          )}
        </div>

        {/* 类型行 + 等级 */}
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
            title={m.typeLine}
          >
            {m.typeLine}
          </span>
          {m.level !== undefined && (
            <span
              style={{
                color: "var(--card-generic-text)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
              title={m.levelLabel}
            >
              {m.levelLabel ? `${m.levelLabel} ` : ""}
              {m.level}
            </span>
          )}
        </div>

        {/* 正文 */}
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

          {/* 底部渐隐 */}
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

        {/* 属性行 */}
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
            {m.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {m.atkLabel ?? "ATK"}
                </span>{" "}
                {m.atk}
              </span>
            )}
            {m.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {m.defLabel ?? "DEF"}
                </span>{" "}
                {m.def}
              </span>
            )}
            {m.hp !== undefined && (
              <span>
                <span style={{ color: "var(--card-generic-text-dim)" }}>
                  {m.hpLabel ?? "HP"}
                </span>{" "}
                {m.hp}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
