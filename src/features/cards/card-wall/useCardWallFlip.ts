import { useLayoutEffect, useRef } from "react";

/** 位置变化超过半个像素才算移动，避免亚像素抖动触发无谓动画。 */
const MOVE_EPSILON = 0.5;

const MOVE_MS = 180;
const ENTER_MS = 140;

export interface Rect {
  left: number;
  top: number;
}

/** 从旧位置到新位置需要补回的位移。FLIP 的「invert」量。 */
export function flipDelta(old: Rect, cur: Rect): { dx: number; dy: number } {
  return { dx: old.left - cur.left, dy: old.top - cur.top };
}

export function hasMoved(d: { dx: number; dy: number }): boolean {
  return Math.abs(d.dx) > MOVE_EPSILON || Math.abs(d.dy) > MOVE_EPSILON;
}

/**
 * 卡片墙的 FLIP 过渡。
 *
 * 筛选 / 排序变化时，卡片从旧位置滑到新位置，而不是「跳」过去。
 * 做法是经典的四步：记录旧位置（First）→ 让 React 更新到新位置（Last）→
 * 用 transform 把元素挪回旧位置（Invert）→ 下一帧去掉 transform 并加
 * transition，让它滑到新位置（Play）。
 *
 * 三个坑：
 *
 * 1. **transform 不影响布局但影响 getBoundingClientRect**，所以每次跑之前
 *    必须先把上一次设的内联样式清掉再量，否则量到的是动画中间态。
 * 2. **退场做不了**：被筛掉的卡片已经不在 DOM 里，没有可动画的对象。
 *    所以只做「留下的滑过去」+「新出现的淡入」。
 * 3. **量 N 个 rect 是强制同步布局**。调用方必须限额渲染，
 *    否则几千张卡就是几千次 reflow —— 这也正是先做限额的原因。
 */
export function useCardWallFlip(
  containerRef: React.RefObject<HTMLElement | null>,
  /** 变化后重跑的身份签名（如筛选条件） */
  signature: string,
  enabled: boolean,
): void {
  const prevRects = useRef<Map<string, Rect>>(new Map());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const els = Array.from(
      container.querySelectorAll<HTMLElement>("[data-card-id]"),
    );

    // 上一次可能设了 transform / opacity，先清掉再量，拿到的是落定位置。
    // 顺序不能反：先量再清等于每个元素测两次，N 张卡就是 2N 次强制布局 ——
    // 而这正是本 hook 最贵的地方。
    for (const el of els) {
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
    }

    const entries = els.map((el) => ({
      el,
      id: el.dataset.cardId,
      rect: el.getBoundingClientRect(),
    }));

    const prev = prevRects.current;
    prevRects.current = new Map(
      entries.map((e) => [e.id ?? "", { left: e.rect.left, top: e.rect.top }]),
    );

    // 首次渲染（没有旧位置）或用户要求减少动效 → 只记录，不动画
    if (!enabled || prev.size === 0) return;

    const moves: { el: HTMLElement; dx: number; dy: number }[] = [];
    const enters: HTMLElement[] = [];
    for (const e of entries) {
      if (!e.id) continue;
      const old = prev.get(e.id);
      if (!old) {
        enters.push(e.el);
        continue;
      }
      const d = flipDelta(old, e.rect);
      if (hasMoved(d)) moves.push({ el: e.el, ...d });
    }
    if (moves.length === 0 && enters.length === 0) return;

    for (const m of moves) {
      m.el.style.transition = "none";
      m.el.style.transform = `translate(${m.dx}px, ${m.dy}px)`;
    }
    for (const el of enters) el.style.opacity = "0";

    // 双 rAF：第一帧让浏览器画出 invert 后的状态，第二帧才开始过渡。
    // 单 rAF 在部分浏览器上会和样式写入合并，导致没有动画直接跳到终点。
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        for (const m of moves) {
          m.el.style.transition = `transform ${MOVE_MS}ms ease-out`;
          m.el.style.transform = "";
        }
        for (const el of enters) {
          el.style.transition = `opacity ${ENTER_MS}ms ease-out`;
          el.style.opacity = "";
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // signature 是唯一的触发条件：其余都是 ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled]);
}
