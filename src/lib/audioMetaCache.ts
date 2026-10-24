import { loadAsset } from "./assetCache";

/**
 * 音频元数据的轻量前端缓存。
 *
 * 历史实现里 PlayerView 每行都用隐藏的 `new Audio()` 现读 duration，
 * N 首曲目就有 N 个音频元请求，且每次列表重渲染都会重建。
 * 这里把时长缓存到模块级 Map：同一曲目只解码一次，跨重渲染 / 跨模块切换复用。
 *
 * 这是 P0 的「前端缓存」版；更彻底的「持久化到 SQLite 索引」是后续步骤
 * （需要 Rust 侧在 import / 首次播放时把 duration 写回索引，文本真相源不变）。
 */

const durationCache = new Map<string, number>();
const inflight = new Map<string, Promise<number | null>>();

/** 异步预取时长：命中缓存直接返回，未缓存则解码一次并写入缓存。 */
export function prefetchDuration(path: string): Promise<number | null> {
  const cached = durationCache.get(path);
  if (cached !== undefined) return Promise.resolve(cached);
  const pending = inflight.get(path);
  if (pending) return pending;

  const p = (async (): Promise<number | null> => {
    const url = await loadAsset(path);
    if (!url) return null;
    const audio = new Audio();
    audio.preload = "metadata";
    const d = await new Promise<number | null>((resolve) => {
      let settled = false;
      const done = (v: number | null) => {
        if (settled) return;
        settled = true;
        resolve(v);
      };
      audio.addEventListener("loadedmetadata", () =>
        done(Number.isFinite(audio.duration) ? audio.duration : null),
      );
      audio.addEventListener("error", () => done(null));
      // 解码失败时兜底，避免挂起
      window.setTimeout(() => done(null), 5000);
      audio.src = url;
    });
    if (d !== null) durationCache.set(path, d);
    inflight.delete(path);
    return d;
  })();

  inflight.set(path, p);
  return p;
}

/**
 * 清空时长缓存。键是 `assets/audio/x.mp3` 这类相对路径，换项目后
 * 同名文件会命中上一个项目的时长，所以打开项目时必须清。
 */
export function clearDurationCache(): void {
  durationCache.clear();
  inflight.clear();
}
