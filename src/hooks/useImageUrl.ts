import { useEffect, useSyncExternalStore } from "react";
import {
  getCachedImage,
  loadImage,
  subscribeImageCache,
} from "../lib/imageCache";

export function useImageUrl(relative: string | null | undefined) {
  const url = useSyncExternalStore(
    subscribeImageCache,
    () => (relative ? getCachedImage(relative) : null),
    () => null
  );

  useEffect(() => {
    if (!relative) return;
    let cancelled = false;
    loadImage(relative).catch(() => {
      if (!cancelled) {
        // 加载失败，不影响渲染
      }
    });
    return () => {
      cancelled = true;
    };
  }, [relative]);

  return url;
}