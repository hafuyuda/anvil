import { ipc } from "../core/ipc/ipc";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const listeners = new Set<() => void>();

export function getCachedImage(relative: string): string | null {
  return cache.get(relative) ?? null;
}

export function subscribeImageCache(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

export async function loadImage(relative: string): Promise<string> {
  const cached = cache.get(relative);
  if (cached) return cached;

  const inFlight = pending.get(relative);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const url = await ipc.readImageDataUrl(relative);
      cache.set(relative, url);
      notify();
      return url;
    } finally {
      pending.delete(relative);
    }
  })();

  pending.set(relative, promise);
  return promise;
}

export function invalidateImage(relative: string) {
  cache.delete(relative);
  notify();
}

export function clearImageCache() {
  cache.clear();
  pending.clear();
  notify();
}
