import { useEffect, useRef, useState } from "react";
import { CardFrame } from "./CardFrame";
import { SIZE_MAP, type CardFrameSize } from "./CardFrame/types";
import type { Card, CardType } from "../core/ipc";

interface Props {
  card: Card;
  cardType: CardType;
  /** 基准尺寸，默认 medium */
  baseSize?: CardFrameSize;
  /** 缩放下限，默认 1.0（不缩小） */
  minScale?: number;
  /** 缩放上限，默认 2.5 */
  maxScale?: number;
  /** 是否居中 */
  center?: boolean;
}

export function ScaledCardFrame({
  card,
  cardType,
  baseSize = "medium",
  minScale = 1,
  maxScale = 2.5,
  center = true,
}: Props) {
  const spec = SIZE_MAP[baseSize];
  const baseW = spec.w;
  const baseH = spec.h;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availWidth, setAvailWidth] = useState(baseW);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setAvailWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = Math.max(minScale, Math.min(maxScale, availWidth / baseW));
  const finalW = baseW * scale;
  const finalH = baseH * scale;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      <div
        style={{
          width: finalW,
          height: finalH,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: baseW,
            height: baseH,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: "top left",
          }}
        >
          <CardFrame card={card} cardType={cardType} size={baseSize} />
        </div>
      </div>
    </div>
  );
}
