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

/** 取父目录。"a/b/c.mp3" -> "a/b"；无分隔符时返回 "" */
export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

/** 取扩展名（含点，小写）。"a/b/c.MP3" -> ".mp3"；无扩展名返回 "" */
export function extname(p: string): string {
  const base = basename(p);
  const i = base.lastIndexOf(".");
  return i <= 0 ? "" : base.slice(i).toLowerCase();
}

/** 去扩展名。"a/b/c.mp3" -> "a/b/c" */
export function withoutExt(p: string): string {
  const ext = extname(p);
  return ext ? p.slice(0, -ext.length) : p;
}
