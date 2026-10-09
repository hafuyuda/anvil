/**
 * 应用界面缩放。
 * 用 CSS zoom（Chromium 支持），作用在 #root 上。
 * 参数 clamp 到 0.75–1.5。
 */
export function applyFontScale(scale: number): void {
  const s = Math.max(0.75, Math.min(1.5, scale));
  const root = document.getElementById("root");
  if (root) {
    root.style.zoom = String(s);
  }
}