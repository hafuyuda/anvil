import { useEffect, useMemo, useState } from "react";
import { ipc, type Card, type CardType } from "../../../core/ipc";

export type SortKey = "name" | "updated_at" | "type";

export function useCardWallFilters(cards: Card[], cardTypes: CardType[]) {
  const [query, setQuery] = useState("");
  const [ftsIds, setFtsIds] = useState<string[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("type");
  const [sortAsc, setSortAsc] = useState(true);

  // FTS 搜索（≥3 字符），150ms 防抖
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 3) {
      setFtsIds(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const ids = await ipc.searchCards(q, 500);
        setFtsIds(ids.length > 0 ? ids : null);
      } catch {
        setFtsIds(null);
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  const typeName = (typeId: string) =>
    cardTypes.find((t) => t.id === typeId)?.name ?? typeId.slice(0, 8);

  const visible = useMemo(() => {
    let list = cards;
    const q = query.trim();
    if (q) {
      if (ftsIds && ftsIds.length > 0) {
        const set = new Set(ftsIds);
        list = list.filter((c) => set.has(c.id));
      } else {
        const lower = q.toLowerCase();
        list = list.filter((c) => {
          if (c.name.toLowerCase().includes(lower)) return true;
          return Object.values(c.values).some((v) =>
            typeof v === "string" ? v.toLowerCase().includes(lower) : false,
          );
        });
      }
    }
    if (typeFilter) {
      list = list.filter((c) => c.type_id === typeFilter);
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "updated_at") cmp = a.updated_at - b.updated_at;
      else cmp = typeName(a.type_id).localeCompare(typeName(b.type_id));
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [cards, query, ftsIds, typeFilter, sortKey, sortAsc, cardTypes]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  }

  const isFtsActive = Boolean(query.trim() && ftsIds && ftsIds.length > 0);

  return {
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    sortKey,
    sortAsc,
    toggleSort,
    visible,
    isFtsActive,
  };
}
