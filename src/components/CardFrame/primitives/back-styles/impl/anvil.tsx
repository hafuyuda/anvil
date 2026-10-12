import { SIZE_MAP } from "../../../types";
import type { CardBackStyleDef, CardBackStyleProps } from "../types";

/**
 * 内置默认卡背：双层菱形描边 + "Anvil" 字样。
 * 视觉与原 CardBack.tsx 的 DefaultCardBack 完全等价。
 */
function AnvilBack({ size }: CardBackStyleProps) {
  const spec = SIZE_MAP[size];
  const glyphSize = size === "small" ? 14 : size === "medium" ? 18 : 24;

  return (
    <div
      style={{
        width: spec.w,
        height: spec.h,
        borderRadius: spec.borderRadius,
        flexShrink: 0,
        background:
          "linear-gradient(160deg, var(--card-back-bg-1) 0%, var(--card-back-bg-2) 100%)",
        border: "1px solid var(--card-back-border)",
        boxShadow: "var(--card-back-shadow)",
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
        <polygon
          points="50,8 90,70 50,132 10,70"
          fill="none"
          stroke="var(--card-back-border)"
          strokeWidth="1.5"
        />
        <polygon
          points="50,18 80,70 50,122 20,70"
          fill="none"
          stroke="var(--card-back-border)"
          strokeWidth="0.6"
          opacity="0.6"
        />
        <text
          x="50"
          y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--card-back-glyph)"
          fontFamily="Georgia, 'Songti SC', serif"
          fontSize={glyphSize}
          fontWeight="600"
          letterSpacing="1.5"
        >
          Anvil
        </text>
      </svg>
    </div>
  );
}

const def: CardBackStyleDef = {
  id: "anvil",
  label: "铁砧",
  Component: AnvilBack,
};

export default def;
