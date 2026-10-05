import type { Card, CardType } from "../../core/ipc";
import { SIZE_MAP, type CardFrameSize } from "./types";
import { mapCard } from "./yugioh";

interface Props {
  card: Card;
  cardType: CardType;
  size?: CardFrameSize;
  selected?: boolean;
  onClick?: () => void;
}

export function CardFrameYuGiOh({
  card,
  cardType,
  size = "medium",
  selected = false,
  onClick,
}: Props) {
  const spec = SIZE_MAP[size];
  const m = mapCard(card, cardType);
  const accent = cardType.color ?? "#8b6f47";

  const displayBody = m.body.length > 0 ? m.body : (cardType.description ?? "");
  const stars = m.level ? "★".repeat(Math.min(m.level, 12)) : "";

  return (
    <div
      onClick={onClick}
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        padding: 3,
        boxSizing: "border-box",
        background: `linear-gradient(145deg, #d4c5a0 0%, #b8a678 50%, #8f7d52 100%)`,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 0 0 4px ${accent}, 0 4px 12px rgba(0,0,0,0.3)`
          : "0 2px 6px rgba(0,0,0,0.25)",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "none",
      }}
    >
      {/* 内层金边 */}
      <div
        style={{
          flex: 1,
          border: `1px solid ${accent}`,
          borderRadius: spec.borderRadius - 2,
          padding: spec.padding,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: spec.padding / 2,
          background: `linear-gradient(180deg, #f7efd6 0%, #ede0bf 100%)`,
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 6px",
            background: `linear-gradient(180deg, ${accent} 0%, ${darken(accent)} 100%)`,
            borderRadius: 3,
            border: `1px solid ${darken(accent, 0.3)}`,
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
              fontFamily: "Georgia, serif",
            }}
            title={m.title}
          >
            {m.title}
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

        {/* 图像区 */}
        <div
          style={{
            flex: "0 0 auto",
            height: spec.h * 0.38,
            background: `linear-gradient(180deg, ${accent}22 0%, ${accent}55 100%)`,
            border: `1px solid ${darken(accent, 0.2)}`,
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: spec.h * 0.22,
              fontWeight: 700,
              color: "#fff",
              textShadow: `0 2px 4px ${darken(accent, 0.3)}`,
              opacity: 0.85,
              fontFamily: "Georgia, serif",
            }}
          >
            {m.title.slice(0, 2)}
          </div>
        </div>

        {/* 等级条 */}
        {stars && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: spec.metaSize,
              color: "#b8860b",
              letterSpacing: -1,
              padding: "0 4px",
              textShadow: "0 0 1px #fff",
            }}
          >
            {stars}
          </div>
        )}

        {/* 类型行 */}
        <div
          style={{
            fontSize: spec.typeSize,
            textAlign: "center",
            color: "#4a3a1a",
            padding: "1px 0",
            borderTop: `1px solid ${accent}66`,
            borderBottom: `1px solid ${accent}66`,
            fontStyle: "italic",
            letterSpacing: 0.3,
          }}
        >
          {m.typeLine}
        </div>

        {/* 描述框 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: "#fdfaee",
            border: `1px solid ${accent}88`,
            borderRadius: 3,
            padding: `${spec.padding}px ${spec.padding + 2}px`,
            fontSize: spec.bodySize,
            lineHeight: 1.35,
            color: "#3a2a10",
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

          {/* ATK/DEF */}
          {(m.atk !== undefined || m.def !== undefined) && (
            <div
              style={{
                position: "absolute",
                right: 4,
                bottom: 2,
                display: "flex",
                gap: 6,
                fontSize: spec.statSize,
                fontWeight: 700,
                color: "#3a2a10",
                background: "#fdfaeecc",
                padding: "0 4px",
              }}
            >
              {m.atk !== undefined && <span>ATK/{m.atk}</span>}
              {m.def !== undefined && <span>DEF/{m.def}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 简易颜色加深 */
function darken(hex: string, amount = 0.2): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const n = parseInt(clean, 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
