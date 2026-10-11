import { useEffect, useRef } from "react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

/**
 * Ctrl/Cmd + 滚轮缩放。
 * 缩放时保持鼠标位置对应的棋盘坐标不动。
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const z = zoomRef.current;
      const delta = -e.deltaY * 0.0015;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * Math.exp(delta)));
      if (next === z) return;

      const rect = container!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const boardX = (container!.scrollLeft + px) / z;
      const boardY = (container!.scrollTop + py) / z;

      onZoomRef.current(next);

      requestAnimationFrame(() => {
        container!.scrollLeft = boardX * next - px;
        container!.scrollTop = boardY * next - py;
      });
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [containerRef]);
}
