import { SIZE_MAP, type CardFrameSize } from "./types";
import { useImageUrl } from "../../hooks/useImageUrl";
import { useProjectStore } from "../../stores/projectStore";

interface Props {
  /** 卡背图片路径。为空时用项目默认 */
  path?: string | null;
  size?: CardFrameSize;
}

/**
 * 卡背渲染。解析优先级：
 *   1. 显式传入的 path（类型级 card_back）
 *   2. store 里 manifest.default_card_back（项目级）
 *   3. 内置「棱形框 + Anvil」图案
 */
export function CardBack({ path, size = "small" }: Props) {
  const spec = SIZE_MAP[size];
  const defaultBack = useProjectStore(
    (s) => s.manifest?.default_card_back ?? null,
  );
  const resolved = path ?? defaultBack;
  const url = useImageUrl(resolved);

  if (url) {
    return (
      <div
        style={{
          width: spec.w,
          height: spec.h,
          borderRadius: spec.borderRadius,
          overflow: "hidden",
          flexShrink: 0,
          border: "1px solid var(--card-back-border)",
          boxShadow: "var(--card-back-shadow)",
        }}
      >
        <img
          src={url}
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
      </div>
    );
  }

  return <DefaultCardBack size={size} />;
}

function DefaultCardBack({ size }: { size: CardFrameSize }) {
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
