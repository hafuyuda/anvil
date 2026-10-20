import { useEffect, useRef } from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

/** 缩放动画时长。再长就觉得拖沓，Ctrl+滚轮是连续手势。 */
const ZOOM_MS = 140;

/** easeOutCubic：起步快、收尾稳，符合「缩放跟上手」的直觉。 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ctrl/Cmd + 滚轮缩放。
 *
 * 缩放插值过去而不是瞬跳 —— 原先一步到目标值，视觉上是「画面抖了一下」。
 * 插值期间**鼠标对应的棋盘坐标必须不动**，所以锚点在手势开始时算一次，
 * 之后每帧都按它设 scrollLeft/Top，而不是每帧重算。
 *
 * 连续滚动时取消上一段动画、从「当前实际缩放」重新取锚点，
 * 否则中途接手会让画面跳一下。
 */
export function useCanvasZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
  zoom: number,
  onZoomChange: (z: number) => void,
): void {
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const onZoomRef = useRef(onZoomChange);
  onZoomRef.current = onZoomChange;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function stopAnimation() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const from = zoomRef.current;
      const delta = -e.deltaY * 0.0015;
      const to = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, from * Math.exp(delta)));
      if (to === from) return;

      const rect = container!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // 手势开始时的锚点：鼠标此刻对应的棋盘坐标，整个动画期间不变
      const boardX = (container!.scrollLeft + px) / from;
      const boardY = (container!.scrollTop + py) / from;

      stopAnimation();
      const start = performance.now();

      function frame(now: number) {
        const t = Math.min(1, (now - start) / ZOOM_MS);
        const z = from + (to - from) * easeOut(t);
        onZoomRef.current(z);
        // zoom 是 React state，要等下一帧布局后才能量到新尺寸
        requestAnimationFrame(() => {
          container!.scrollLeft = boardX * z - px;
          container!.scrollTop = boardY * z - py;
        });
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          rafRef.current = null;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      stopAnimation();
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef]);
}
