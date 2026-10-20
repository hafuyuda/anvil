import { CardFrame, SIZE_MAP } from "../CardFrame";
import type { CardGridProps, GridCardProps } from "./types";

export type { CardGridProps, GridCardProps } from "./types";

export function CardGrid({
  children,
  gap = 12,
  paddingTop = 0,
}: CardGridProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap,
        paddingTop,
      }}
    >
      {children}
    </div>
  );
}

export function GridCard({
  card,
  cardType,
  size = "small",
  selected,
  foil,
  onClick,
  overlay,
  wrapperRef,
  wrapperProps,
  style,
}: GridCardProps) {
  const spec = SIZE_MAP[size];

  // 缺卡或缺类型 → 红虚线占位
  if (!card || !cardType) {
    return (
      <div
        ref={wrapperRef}
        {...wrapperProps}
        style={{
          position: "relative",
          width: spec.w,
          height: spec.h,
          flexShrink: 0,
          ...style,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            border: "1px dashed var(--danger)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "var(--danger)",
            background: "var(--bg-panel)",
            textAlign: "center",
            padding: 8,
            boxSizing: "border-box",
            lineHeight: 1.4,
          }}
        >
          {card ? "找不到类型" : "已删除的卡"}
        </div>
        {overlay && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              zIndex: 2,
            }}
          >
            {overlay}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      {...wrapperProps}
      // 闪卡才挂倾斜标记：倾斜会盖掉本元素的 transform，
      // 而 dnd-kit 的拖拽正是靠 wrapperProps 传 transform 的
      data-tilt={foil === true ? "" : undefined}
      onClick={onClick}
      style={{
        position: "relative",
        flexShrink: 0,
        ...style,
      }}
    >
      <CardFrame
        card={card}
        cardType={cardType}
        size={size}
        selected={selected}
        foil={foil}
      />
      {overlay && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 2,
          }}
        >
          {overlay}
        </div>
      )}
    </div>
  );
}
