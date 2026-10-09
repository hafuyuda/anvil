import { useEffect, useSyncExternalStore } from "react";
import {
  getCachedAudio,
  loadAudio,
  subscribeAudioCache,
} from "../lib/audioCache";

export function useAudioUrl(relative: string | null | undefined) {
  const url = useSyncExternalStore(
    subscribeAudioCache,
    () => (relative ? getCachedAudio(relative) : null),
    () => null,
  );

  useEffect(() => {
    if (!relative) return;
    let cancelled = false;
    loadAudio(relative).catch(() => {
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
