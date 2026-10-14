export interface AggregateEntry {
  cardId: string;
  count: number;
}

/** 把含重复的 cardIds 聚合成列表，保持首次出现顺序 */
export function aggregate(cardIds: string[]): AggregateEntry[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    if (!counts.has(id)) order.push(id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return order.map((id) => ({ cardId: id, count: counts.get(id)! }));
}

/** 展开成含重复的 cardIds 数组 */
export function expand(entries: AggregateEntry[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) out.push(e.cardId);
  }
  return out;
}

/** 移除一份 */
export function removeOne(cardIds: string[], cardId: string): string[] {
  const idx = cardIds.indexOf(cardId);
  if (idx < 0) return cardIds;
  return [...cardIds.slice(0, idx), ...cardIds.slice(idx + 1)];
}

/** 按新的唯一顺序重排（保留每张卡的份数） */
export function reorderByUnique(
  cardIds: string[],
  newUniqueOrder: string[],
): string[] {
  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const out: string[] = [];
  for (const id of newUniqueOrder) {
    const n = counts.get(id) ?? 0;
    for (let i = 0; i < n; i++) out.push(id);
  }
  return out;
}
