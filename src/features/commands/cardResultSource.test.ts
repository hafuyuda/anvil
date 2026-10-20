import { beforeEach, describe, expect, it, vi } from "vitest";
import { ipc, type Card } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { createCardResultSource } from "./cardResultSource";

function card(id: string, name: string, typeId = "t1"): Card {
  return {
    id,
    type_id: typeId,
    name,
    values: {},
    created_at: 0,
    updated_at: 0,
  };
}

const CARDS = [
  card("c1", "索林", "t1"),
  card("c2", "巴林", "t2"),
  card("c3", "红龙斯毛格", "t1"),
  card("c4", "铁炉酒馆", "t3"),
];

function setupStore() {
  useProjectStore.setState({
    cards: CARDS,
    cardTypes: [
      {
        id: "t1",
        name: "角色",
        fields: [],
        allowed_relation_kinds: [],
        views: [],
        created_at: 0,
        updated_at: 0,
      },
      {
        id: "t2",
        name: "地点",
        fields: [],
        allowed_relation_kinds: [],
        views: [],
        created_at: 0,
        updated_at: 0,
      },
      {
        id: "t3",
        name: "场景",
        fields: [],
        allowed_relation_kinds: [],
        views: [],
        created_at: 0,
        updated_at: 0,
      },
    ],
  });
}

describe("createCardResultSource", () => {
  beforeEach(() => {
    setupStore();
    vi.restoreAllMocks();
  });

  it("空 query 直接返回空", async () => {
    const source = createCardResultSource();
    expect(await source.search("")).toEqual([]);
    expect(await source.search("   ")).toEqual([]);
  });

  it("少于 3 字符走本地名字过滤（trigram 分词匹配不了短词）", async () => {
    const spy = vi.spyOn(ipc, "searchCards");
    const source = createCardResultSource();

    const hits = await source.search("索");
    expect(hits.map((c) => c.label)).toEqual(["索林"]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("≥3 字符走 FTS，并按索引返回的顺序", async () => {
    // FTS 的顺序是相关性排序，不能被 Map 查找打乱
    vi.spyOn(ipc, "searchCards").mockResolvedValue(["c3", "c1"]);
    const source = createCardResultSource();

    const hits = await source.search("矮人王");
    expect(hits.map((c) => c.label)).toEqual(["红龙斯毛格", "索林"]);
  });

  it("结果带上卡牌类型名，让人知道跳过去是哪类卡", async () => {
    vi.spyOn(ipc, "searchCards").mockResolvedValue(["c2"]);
    const source = createCardResultSource();
    const hits = await source.search("巴林");
    expect(hits[0].category).toBe("卡牌 · 地点");
  });

  it("滤掉索引里残留的 id（卡已删但索引没重建）", async () => {
    // 查询词要 ≥3 字符才会走 FTS 分支
    vi.spyOn(ipc, "searchCards").mockResolvedValue(["c1", "不存在的id", "c4"]);
    const source = createCardResultSource();
    const hits = await source.search("矿坑酒馆");
    expect(hits.map((c) => c.label)).toEqual(["索林", "铁炉酒馆"]);
  });

  it("FTS 抛错时退回本地名字过滤，不让面板空手", async () => {
    vi.spyOn(ipc, "searchCards").mockRejectedValue(new Error("no index"));
    const source = createCardResultSource();
    const hits = await source.search("铁炉");
    expect(hits.map((c) => c.label)).toEqual(["铁炉酒馆"]);
  });

  it("FTS 无结果时也退回本地名字过滤", async () => {
    vi.spyOn(ipc, "searchCards").mockResolvedValue([]);
    const source = createCardResultSource();
    const hits = await source.search("巴林");
    expect(hits.map((c) => c.label)).toEqual(["巴林"]);
  });

  it("run 切到世界观模块并选中该卡", async () => {
    vi.spyOn(ipc, "searchCards").mockResolvedValue(["c3"]);
    const source = createCardResultSource();
    const [hit] = await source.search("红龙");

    useProjectStore.setState({ activeModule: "session", selectedCardId: null });
    await hit.run();

    const s = useProjectStore.getState();
    expect(s.activeModule).toBe("world");
    expect(s.selectedCardId).toBe("c3");
  });

  it("搜索时从 store 现取卡表 —— 卡改名后不必重新注册", async () => {
    vi.spyOn(ipc, "searchCards").mockImplementation(async (_q, limit) => {
      const s = useProjectStore.getState();
      return (s.cards ?? []).slice(0, limit ?? 20).map((c) => c.id);
    });
    useProjectStore.setState({
      cards: [card("c9", "刚改名的卡", "t1")],
    });
    const source = createCardResultSource();

    const hits = await source.search("刚改名");
    expect(hits.map((c) => c.label)).toEqual(["刚改名的卡"]);
  });
});
