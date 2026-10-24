/**
 * 数值工具。
 */

/** 把 v 钳制到 [lo, hi]。等价于 Math.max(lo, Math.min(hi, v))。 */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** 把 v 钳制到 [0, 1]。 */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
