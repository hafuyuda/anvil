import { convertFileSrc } from "@tauri-apps/api/core";
import { ipc } from "../core/ipc";

/**
 * relative path → asset URL 的缓存（图片 / 音频共用）。
 * asset URL 由 convertFileSrc(绝对路径) 生成，WebView 直接从磁盘读。
 * 项目关闭时清空。
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();

export function getCachedAsset(relative: string): string | null {
  return cache.get(relative) ?? null;
}

export function subscribeAssetCache(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

/** 解析相对路径为 asset URL。找不到文件时返回 null。 */
export async function loadAsset(relative: string): Promise<string | null> {
  const cached = cache.get(relative);
  if (cached) return cached;

  const inFlight = pending.get(relative);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const abs = await ipc.assetAbsPath(relative);
      const url = convertFileSrc(abs);
      cache.set(relative, url);
      notify();
      return url;
    } catch {
      return null;
    } finally {
      pending.delete(relative);
    }
  })();

  pending.set(relative, promise);
  return promise;
}

export function invalidateAsset(relative: string) {
  cache.delete(relative);
  notify();
}

export function clearAssetCache() {
  cache.clear();
  pending.clear();
  notify();
}
