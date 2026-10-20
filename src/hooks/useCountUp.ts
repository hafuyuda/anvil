import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/** 滚动时长。比血条的 0.15s 略长，数字才看得清。 */
const DURATION_MS = 320;

/** easeOutCubic：起步快、收尾稳。 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** 从 from 滚动到 to 时，t ∈ [0,1] 处的插值。 */
export function countUpValue(from: number, to: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return from + (to - from) * easeOutCubic(clamped);
}

/**
 * 数字滚动到目标值。
 *
 * HP 条本身有 width 过渡，但数字是瞬间跳的 —— 血条在滑、数字在跳，
 * 两者不同步反而更难看。这里让数字跟着血条一起走。
 *
 * `display` 故意不进 effect 依赖：它每帧都在变，进依赖会让动画每帧重启。
 * 实时值放 ref，effect 只在 target 变化时跑一次。
 */
export function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (reduced) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const from = displayRef.current;
    if (from === target) return;
    const start = performance.now();

    function frame(now: number) {
      const t = (now - start) / DURATION_MS;
      const v = countUpValue(from, target, t);
      displayRef.current = t >= 1 ? target : v;
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, reduced]);

  return display;
}
