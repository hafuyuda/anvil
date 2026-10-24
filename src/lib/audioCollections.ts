import { getAppSettings, setAppSettings } from "./appSettings";
import { colorFromString } from "./color";

/**
 * 音频集合（分组 / 收藏）的前端持久化工具。
 *
 * 集合是「对音频资产的呈现层分组」，语义对应剧本里的 @bgm / @sfx：
 * 「战斗 BGM」「酒馆 BGM」等。它属于用户组织偏好，存于 appSettings
 * （localStorage），不触碰 assets/audio 下的文本真相源。
 *
 * 若未来需要让集合随项目（git）共享，应改为 Rust 侧 audio_meta 索引表
 * 返回 AudioMeta.collection —— 那是一次独立的后端迁移，不在此文件范围。
 */

/** 读取某曲目所属集合名；未分组返回 null。 */
export function getCollection(path: string): string | null {
  return getAppSettings().playerCollections[path] ?? null;
}

/** 设置 / 清除某曲目的集合。name 为空或空白 = 取消分组。 */
export function setCollection(path: string, name: string | null): void {
  const collections = { ...getAppSettings().playerCollections };
  const trimmed = name?.trim();
  if (trimmed) collections[path] = trimmed;
  else delete collections[path];
  setAppSettings({ playerCollections: collections });
}

/** 删除若干曲目后，清理其集合映射，避免悬空键。 */
export function removeCollectionsForPaths(paths: string[]): void {
  if (paths.length === 0) return;
  const set = new Set(paths);
  const current = getAppSettings().playerCollections;
  let changed = false;
  const next: Record<string, string> = {};
  for (const [p, c] of Object.entries(current)) {
    if (set.has(p)) {
      changed = true;
      continue;
    }
    next[p] = c;
  }
  if (changed) setAppSettings({ playerCollections: next });
}

/** 从曲目列表中收集所有出现过的集合名，按本地化排序。 */
export function collectionNames(metas: { path: string }[]): string[] {
  const present = new Set<string>();
  for (const m of metas) {
    const c = getCollection(m.path);
    if (c) present.add(c);
  }
  return [...present].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

/** 给定集合名的稳定颜色（HSL），用于封面占位与侧栏色点。未分组返回中性灰。 */
export function collectionColor(name: string | null): string {
  if (!name) return "var(--bg-raised)";
  return colorFromString(name, { saturation: 52, lightness: 46 });
}
