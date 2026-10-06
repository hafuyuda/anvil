import type { Card, CardType } from "../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "./types";
import { mapCard } from "./mapping";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * 极简「条目卡」风格。
 * 无外框、无图像区，只有标题 + 正文 + 属性，大量留白。
 */
export function CardFrameMinimal({
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

  const accentLine = `color-mix(in srgb, ${accent} 55%, transparent)`;
  const accentSoft = `color-mix(in srgb, ${accent} 25%, transparent)`;

  const hasStats =
    m.atk !== undefined || m.def !== undefined || m.hp !== undefined;

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        padding: spec.padding + 4,
        boxSizing: "border-box",
        background: "var(--card-minimal-bg)",
        border: `1px solid ${accentSoft}`,
        borderLeft: `3px solid ${accentLine}`,
        boxShadow: selected
          ? `0 0 0 2px var(--bg-panel), 0 0 0 4px ${accent}, var(--card-minimal-shadow-selected)`
          : "var(--card-minimal-shadow)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "none",
        overflow: "hidden",
      }}
    >
      {/* 标题 */}
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
        title={m.title}
      >
        {m.title}
      </div>

      {/* 副标题 */}
      {m.subtitle && (
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
          title={m.subtitle}
        >
          {m.subtitle}
        </div>
      )}

      {/* 类型行 */}
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
        title={m.typeLine}
      >
        {cardType.icon ? `${cardType.icon} ` : ""}
        {m.typeLine}
      </div>

      {/* 正文 */}
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

      {/* 属性 + 等级 */}
      {(hasStats || m.level !== undefined) && (
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
            {m.level !== undefined &&
              `${m.levelLabel ? `${m.levelLabel} ` : "Lv "}${m.level}`}
          </span>
          <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {m.atk !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {m.atkLabel ?? "ATK"}
                </span>{" "}
                {m.atk}
              </span>
            )}
            {m.def !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {m.defLabel ?? "DEF"}
                </span>{" "}
                {m.def}
              </span>
            )}
            {m.hp !== undefined && (
              <span>
                <span style={{ color: "var(--card-minimal-text-dim)" }}>
                  {m.hpLabel ?? "HP"}
                </span>{" "}
                {m.hp}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
