import { describe, expect, it } from "vitest";
import type { Command } from "../../lib/commands";
import { rankPaletteResults } from "./paletteRanking";

const cmd = (id: string, label: string, keywords?: string[]): Command => ({
  id,
  label,
  category: "测试",
  keywords,
  run: () => {},
});

const undo = cmd("edit.undo", "撤销", ["undo"]);
const board = cmd("nav.board", "棋盘", ["board", "棋盘"]);
const world = cmd("nav.world", "世界观", ["world", "card", "卡片"]);

describe("rankPaletteResults", () => {
  it("空 query 只返回静态命令，动态结果不出现", () => {
    const cards = [cmd("search.card.a", "红龙")];
    expect(rankPaletteResults([undo], cards, "  ")).toEqual([undo]);
    expect(rankPaletteResults([undo], cards, "")).toEqual([undo]);
  });

  it("没有动态结果时原样返回", () => {
    expect(rankPaletteResults([undo, board], [], "撤销")).toEqual([undo, board]);
  });

  it("标签正好是 query 的静态命令排最前", () => {
    // 输入「撤销」时，不能被正文里提到「撤销」的卡牌挤掉
    const cards = [cmd("search.card.a", "撤销某事的卷轴")];
    const out = rankPaletteResults([undo, board], cards, "撤销");
    expect(out[0]).toBe(undo);
    expect(out.indexOf(undo)).toBeLessThan(out.indexOf(cards[0]));
  });

  it("关键词正好等于 query 也算强匹配", () => {
    const cards = [cmd("search.card.a", "一块 board")];
    const out = rankPaletteResults([board, world], cards, "board");
    expect(out[0]).toBe(board);
  });

  it("输入卡名时卡牌结果排最前", () => {
    const card = cmd("search.card.a", "索林");
    const out = rankPaletteResults([undo, board], [card], "索林");
    expect(out[0]).toBe(card);
  });

  it("弱匹配的静态命令排在动态结果之后", () => {
    // 「世界观」只是关键词里含「卡」，不算强匹配
    const card = cmd("search.card.a", "卡片墙");
    const out = rankPaletteResults([world], [card], "卡");
    expect(out).toEqual([card, world]);
  });

  it("不改变静态命令彼此的相对顺序", () => {
    const card = cmd("search.card.a", "某卡");
    const out = rankPaletteResults([world, undo, board], [card], "某");
    expect(out.filter((c) => c !== card)).toEqual([world, undo, board]);
  });
});
