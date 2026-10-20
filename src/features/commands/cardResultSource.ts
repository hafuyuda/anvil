import { ipc, type Card } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import type { Command, ResultSource } from "../../lib/commands";

/** 面板里最多列几条卡牌结果。再多就该去卡片墙翻了。 */
const LIMIT = 20;

/**
 * FTS 的 trigram 分词至少要 3 个字符才匹配得上。
 * 少于这个数就走本地名字过滤 —— 与卡片墙的行为保持一致。
 */
const FTS_MIN_CHARS = 3;

function toCommand(card: Card, typeName: string): Command {
  return {
    id: `search.card.${card.id}`,
    label: card.name,
    // 类型名跟在后面，让用户知道跳到的是哪类卡
    category: `卡牌 · ${typeName}`,
    run: () => {
      const s = useProjectStore.getState();
      s.setActiveModule("world");
      s.selectCard(card.id);
    },
  };
}

/**
 * 卡牌检索结果源。
 *
 * 命令面板原来靠「一张卡注册一条命令」支持按名字打开卡。那条路有两个问题：
 * 一万张卡就是一万条注册加一万次 notify；而且只匹配卡名，
 * FTS 能搜的字段值与文档正文（`cards_fts` + `docs_fts`）完全够不到。
 *
 * 现在改成源：面板拿着 query 来问，这里现查现给。
 * 卡牌增删改名都不需要重新注册 —— 搜索时从 store 现取。
 */
export function createCardResultSource(): ResultSource {
  return {
    id: "cards",
    minChars: 1,
    search: async (query) => {
      const q = query.trim();
      if (!q) return [];

      const store = useProjectStore.getState();
      const cards = store.cards ?? [];
      const types = store.cardTypes ?? [];
      const typeName = (id: string) =>
        types.find((t) => t.id === id)?.name ?? "未分类";

      let hits: Card[];
      if (q.length < FTS_MIN_CHARS) {
        const lower = q.toLowerCase();
        hits = cards
          .filter((c) => c.name.toLowerCase().includes(lower))
          .slice(0, LIMIT);
      } else {
        let ids: string[] = [];
        try {
          ids = await ipc.searchCards(q, LIMIT);
        } catch {
          // 索引没建好或查询非法时退回本地名字过滤，别让面板空手
          ids = [];
        }
        if (ids.length === 0) {
          const lower = q.toLowerCase();
          hits = cards
            .filter((c) => c.name.toLowerCase().includes(lower))
            .slice(0, LIMIT);
        } else {
          const byId = new Map(cards.map((c) => [c.id, c]));
          // FTS 可能返回索引里残留的 id（卡已删但索引没重建），滤掉
          hits = ids
            .map((id) => byId.get(id))
            .filter((c): c is Card => c !== undefined);
        }
      }

      return hits.map((c) => toCommand(c, typeName(c.type_id)));
    },
  };
}
