/**
 * 网格铺开位置：8 列，每格 180×240。
 * index 是该 token 在棋盘上的全局序号（含已有 token）。
 */
export function gridPosition(index: number): { x: number; y: number } {
  const gx = 100 + (index % 8) * 180;
  const gy = 100 + Math.floor(index / 8) * 240;
  return { x: gx, y: gy };
}

/** Fisher-Yates 洗牌，返回新数组 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
