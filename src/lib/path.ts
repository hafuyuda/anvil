/**
 * 路径工具。
 *
 * Anvil 全程使用 "/" 分隔的相对路径（含 Tauri 资源路径），不依赖浏览器
 * 的 URL 解析。统一在此处理，避免各组件里散落的 `p.split("/").pop()`。
 */

/** 取文件名（含扩展名）。"a/b/c.mp3" -> "c.mp3" */
export function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

