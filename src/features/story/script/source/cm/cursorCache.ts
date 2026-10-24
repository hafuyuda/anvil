interface Saved {
  anchor: number;
  head: number;
  scrollTop: number;
}

const cache = new Map<string, Saved>();

export function saveCursor(cardId: string, state: Saved) {
  cache.set(cardId, state);
}

export function loadCursor(cardId: string): Saved | null {
  return cache.get(cardId) ?? null;
}
