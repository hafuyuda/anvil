import { CardBack } from "../../components/CardFrame/CardBack";
import { SIZE_MAP, type CardFrameSize } from "../../components/CardFrame/types";

interface Props {
  remaining: number;
  total: number;
  size?: CardFrameSize;
}

/**
 * 卡盒视觉。底下一张卡背，右下角错位叠影，角落显示 N / M。
 * 纯展示，不含交互（交互在批次 5 加）。
 */
export function PileToken({ remaining, total, size = "small" }: Props) {
  const spec = SIZE_MAP[size];
  const isEmpty = remaining === 0;

  return (
    <div
      style={{
        width: spec.w,
        height: spec.h,
        position: "relative",
        opacity: isEmpty ? 0.4 : 1,
        transition: "opacity 0.15s",
        userSelect: "none",
      }}
    >
      {/* 叠影：右下错位 4px，暗示下方还有牌 */}
      {!isEmpty && (
        <>
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              width: spec.w,
              height: spec.h,
              borderRadius: spec.borderRadius,
              background: "var(--card-back-bg-2)",
              border: "1px solid var(--card-back-border)",
              opacity: 0.35,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 4,
              top: 4,
              width: spec.w,
              height: spec.h,
              borderRadius: spec.borderRadius,
              background: "var(--card-back-bg-1)",
              border: "1px solid var(--card-back-border)",
              opacity: 0.6,
            }}
          />
        </>
      )}

      {/* 主卡背 */}
      <div style={{ position: "absolute", left: 0, top: 0 }}>
        <CardBack size={size} />
      </div>

      {/* 数量徽章 */}
      <div
        style={{
          position: "absolute",
          right: -8,
          bottom: -8,
          minWidth: 44,
          padding: "2px 7px",
          background: "var(--bg-raised)",
          border: "1px solid var(--accent-gold)",
          borderRadius: 12,
          fontSize: size === "small" ? 10 : 12,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          color: "var(--fg-primary)",
          textAlign: "center",
          whiteSpace: "nowrap",
          zIndex: 2,
          boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        }}
      >
        {remaining} / {total}
      </div>
    </div>
  );
}
