import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { BOARD_PADDING } from "./constants";
import { visibleBoardRect, type BoardRect } from "./viewport";

/**
 * 视口矩形（棋盘坐标，含缓冲）——棋盘 DOM 虚拟化的唯一数据来源。
 *
 * 重算时机：
 * - **scroll**：滚动 / 平移（含 useCanvasZoom 修正 scroll 时程序化触发的），
 *   rAF 合并，一帧最多算一次；
 * - **ResizeObserver**：容器尺寸变化（检查器折叠、窗口缩放）；
 * - **zoom 变化**：同样的滚动像素对应的棋盘范围不同，必须重算。
 *
 * 首帧返回 null，调用方按「全量渲染」处理——挂载前读不到容器尺寸，
 * 而首屏往往正是用户要看的那一屏，宁可多挂一批也不能漏。
 */
export function useVisibleRect(
  containerRef: React.RefObject<HTMLDivElement | null>,
  zoom: number,
): BoardRect | null {
  const [rect, setRect] = useState<BoardRect | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rafRef = useRef<number | null>(null);

  const compute = useCallback((): BoardRect | null => {
    const c = containerRef.current;
    if (!c) return null;
    return visibleBoardRect(
      {
        scrollLeft: c.scrollLeft,
        scrollTop: c.scrollTop,
        clientWidth: c.clientWidth,
        clientHeight: c.clientHeight,
      },
      zoomRef.current,
      BOARD_PADDING,
    );
  }, [containerRef]);

  // rAF 合并：连续 scroll 事件一帧只算一次
  const schedule = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setRect(compute());
    });
  }, [compute]);

  // 挂载：滚动监听 + 容器尺寸监听。
  // 首帧在 layout effect 里同步算完——几百枚 token 的棋盘如果先画一帧
  // 全量再裁剪，打开棋盘时会顿一下。
  useLayoutEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(c);
    setRect(compute());
    return () => {
      c.removeEventListener("scroll", schedule);
      ro.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerRef, schedule, compute]);

  // zoom 变化：立即重算。useCanvasZoom 会在紧随的 rAF 里修正
  // scrollLeft/Top，那会再触发一次 scroll → schedule，自愈一帧的时差。
  useLayoutEffect(() => {
    setRect(compute());
  }, [compute, zoom]);

  return rect;
}
