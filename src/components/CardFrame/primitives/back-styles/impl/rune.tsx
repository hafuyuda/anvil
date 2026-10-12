import { SIZE_MAP } from "../../../types";
import type { CardBackStyleDef, CardBackStyleProps } from "../types";

/**
 * 符文卡背：暗紫底 + 同心圆环 + 中心符文。
 * 颜色全部走 CSS 变量，主题可覆盖。
 */
function RuneBack({ size, accent }: CardBackStyleProps) {
  const spec = SIZE_MAP[size];
  const glyphSize = size === "small" ? 16 : size === "medium" ? 22 : 30;
  const border = accent ?? "var(--card-back-rune-border)";

  return (
    <div
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        flexShrink: 0,
        background: "var(--card-back-rune-bg)",
        border: `1px solid ${border}`,
        boxShadow: "var(--card-back-rune-shadow)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <svg
        viewBox="0 0 100 140"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "72%", height: "72%", display: "block" }}
      >
        {/* 外环 */}
        <circle
          cx="50"
          cy="70"
          r="42"
          fill="none"
          stroke={border}
          strokeWidth="1.2"
          opacity="0.7"
        />
        {/* 内环 */}
        <circle
          cx="50"
          cy="70"
          r="34"
          fill="none"
          stroke={border}
          strokeWidth="0.5"
          opacity="0.4"
        />
        {/* 内环刻度 */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          const x1 = 50 + 34 * Math.cos(a);
          const y1 = 70 + 34 * Math.sin(a);
          const x2 = 50 + 42 * Math.cos(a);
          const y2 = 70 + 42 * Math.sin(a);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={border}
              strokeWidth="0.8"
              opacity="0.5"
            />
          );
        })}
        {/* 中心符文 */}
        <text
          x="50"
          y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--card-back-rune-text)"
          fontFamily="'Cinzel Decorative', Georgia, serif"
          fontSize={glyphSize}
          fontWeight="700"
          letterSpacing="2"
        >
          ᚱ
        </text>
      </svg>
    </div>
  );
}

const def: CardBackStyleDef = {
  id: "rune",
  label: "符文",
  Component: RuneBack,
};

export default def;
