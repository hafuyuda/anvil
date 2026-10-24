/**
 * 展示用格式化。
 *
 * 合并原先散落在 PlayerView / PlayerInspector 的 formatTime / formatSize，
 * 统一签名与占位符行为。
 */

/** 把秒数格式化为 "m:ss"；无效值（null / NaN / 负数）返回 "—"。 */
export function formatDuration(s: number | null | undefined): string {
  if (s === null || s === undefined || !Number.isFinite(s) || s < 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** 把字节数格式化为人类可读字符串（B / KB / MB）；非法值返回 "—"。 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
