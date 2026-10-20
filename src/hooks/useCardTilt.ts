import { useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** 最大倾斜角。再大就像要翻过去了。 */
const MAX_TILT_DEG = 7;

/**
 * 卡牌倾斜跟随鼠标。
 *
 * **一个全局委托监听器**，不给每张卡各挂一个 pointermove ——
 * 卡片墙几百张卡，每张一个监听器光是添加就要几百次，更别说每次重渲染。
 * 这里挂在 document 上，用 `closest("[data-tilt]")` 找目标，
 * 把归一化坐标写进元素的两个 CSS 变量，由 index.css 的规则去旋转。
 *
 * 只对 `data-tilt` 元素生效（目前是闪卡的外层容器），
 * 棋盘 token 之类的小卡不挂 —— 它们尺寸小，倾斜只会让文字发虚。
 *
 * 用 rAF 合并：pointermove 频率高于屏幕刷新率时，多余的帧没有意义。
 */
export function useCardTilt(): void {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    let frame = 0;
    let target: HTMLElement | null = null;
    let px = 0;
    let py = 0;

    // rect 的读取放在 rAF 里而不是事件回调里：
    // pointermove 的频率可以远高于刷新率，每次都同步测一次就是白白的强制布局。
    // 进来时只记坐标，一帧内最多测一次。
    function apply() {
      frame = 0;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // 归一化到 [-1, 1]，左上为 (-1,-1)
      const nx = ((px - rect.left) / rect.width) * 2 - 1;
      const ny = ((py - rect.top) / rect.height) * 2 - 1;
      target.style.setProperty("--tilt-x", nx.toFixed(3));
      target.style.setProperty("--tilt-y", ny.toFixed(3));
    }

    function clear() {
      if (!target) return;
      target.style.removeProperty("--tilt-x");
      target.style.removeProperty("--tilt-y");
      target = null;
    }

    function onMove(e: PointerEvent) {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-tilt]",
      );
      if (!el) {
        clear();
        return;
      }
      px = e.clientX;
      py = e.clientY;
      if (el !== target) {
        clear();
        target = el;
      }
      if (frame === 0) frame = requestAnimationFrame(apply);
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      clear();
      document.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);
}

export { MAX_TILT_DEG };
