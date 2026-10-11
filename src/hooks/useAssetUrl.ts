import { useEffect, useSyncExternalStore } from "react";
import {
  getCachedAsset,
  loadAsset,
  subscribeAssetCache,
} from "../lib/assetCache";

/**
 * 订阅 asset 缓存，返回相对路径对应的 asset URL。
 * 找不到文件时返回 null。图片 / 音频通用。
 */
export function useAssetUrl(relative: string | null | undefined) {
  const url = useSyncExternalStore(
    subscribeAssetCache,
    () => (relative ? getCachedAsset(relative) : null),
    () => null,
  );

  useEffect(() => {
    if (!relative) return;
    let cancelled = false;
    loadAsset(relative).catch(() => {
      if (!cancelled) {
        // 加载失败不影响渲染
      }
    });
    return () => {
      cancelled = true;
    };
  }, [relative]);

  return url;
}
