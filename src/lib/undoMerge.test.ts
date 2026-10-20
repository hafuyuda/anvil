import { describe, expect, it } from "vitest";
import {
  deepEqual,
  insertAtIndices,
  mergeEntity,
  mergeListById,
  idOfById,
} from "./undoMerge";

interface T {
  id: string;
  x: number;
  label?: string;
}

const tok = (id: string, x: number, label?: string): T => ({ id, x, label });

describe("deepEqual", () => {
  it("忽略键序", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("区分嵌套差异", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });
});

describe("insertAtIndices", () => {
  it("按原索引插回", () => {
    const base = ["b", "c", "d"];
    const out = insertAtIndices(base, [
      { item: "a", index: 0 },
      { item: "e", index: 4 },
    ]);
    expect(out).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("索引越界时贴到末尾而不是丢弃", () => {
    const base = ["x"];
    const out = insertAtIndices(base, [{ item: "y", index: 9 }]);
    expect(out).toEqual(["x", "y"]);
  });

  it("同一索引多条保持相对顺序", () => {
    const out = insertAtIndices(["b"], [
      { item: "a1", index: 0 },
      { item: "a2", index: 0 },
    ]);
    expect(out).toEqual(["a1", "a2", "b"]);
  });
});

describe("mergeListById", () => {
  it("撤销删除：删掉的按原索引插回，用户后加的保留", () => {
    const before = [tok("a", 0), tok("b", 1), tok("c", 2)];
    const after = [tok("a", 0), tok("c", 2)]; // 删了 b
    const current = [tok("a", 0), tok("c", 2), tok("d", 3)]; // 用户又加了 d
    expect(mergeListById(before, after, current, idOfById)).toEqual([
      tok("a", 0),
      tok("b", 1),
      tok("c", 2),
      tok("d", 3),
    ]);
  });

  it("撤销移动：用户没再动的回滚，又动过的保留", () => {
    const before = [tok("a", 0), tok("b", 10)];
    const after = [tok("a", 5), tok("b", 10)]; // 把 a 从 0 移到 5
    const current = [tok("a", 5), tok("b", 99)]; // 之后用户又把 b 拖到 99
    expect(mergeListById(before, after, current, idOfById)).toEqual([
      tok("a", 0),
      tok("b", 99),
    ]);
  });

  it("撤销新增：用户没再改过才撤掉", () => {
    const before: T[] = [];
    const after = [tok("a", 0)];
    expect(mergeListById(before, after, [tok("a", 0)], idOfById)).toEqual([]);
    // 用户改过了 → 留下
    expect(mergeListById(before, after, [tok("a", 7)], idOfById)).toEqual([
      tok("a", 7),
    ]);
  });

  it("只插回本次删的，不复活用户另外删掉的", () => {
    const before = [tok("a", 0), tok("b", 1), tok("c", 2)];
    const after = [tok("a", 0), tok("c", 2)]; // 删了 b
    const current = [tok("a", 0)]; // 用户随后又删了 c
    expect(mergeListById(before, after, current, idOfById)).toEqual([
      tok("a", 0),
      tok("b", 1),
    ]);
  });

  it("redo 方向：before / after 对调后语义对称", () => {
    const before = [tok("a", 0), tok("b", 1), tok("c", 2)];
    const after = [tok("a", 0), tok("c", 2)];
    const undone = mergeListById(before, after, [tok("a", 0), tok("c", 2)], idOfById);
    const redone = mergeListById(after, before, undone, idOfById);
    expect(redone).toEqual([tok("a", 0), tok("c", 2)]);
  });
});

describe("mergeEntity", () => {
  interface Board {
    id: string;
    name: string;
    width: number;
    grid: { size: number; visible: boolean; snap: boolean };
    tokens: T[];
    tags: string[];
  }

  const board = (over: Partial<Board> = {}): Board => ({
    id: "b1",
    name: "桌",
    width: 1000,
    grid: { size: 50, visible: true, snap: false },
    tokens: [],
    tags: [],
    ...over,
  });

  it("标量键：当前仍是动作后的值才回滚", () => {
    const before = board({ width: 1000 });
    const after = board({ width: 800 });
    const untouched = board({ width: 800 });
    expect(mergeEntity(before, after, untouched).width).toBe(1000);
    // 用户之后又改了宽度 → 保留
    const edited = board({ width: 640 });
    expect(mergeEntity(before, after, edited).width).toBe(640);
  });

  it("嵌套对象精确到键：改可见性不吞掉之后改的吸附", () => {
    const before = board({ grid: { size: 50, visible: true, snap: false } });
    const after = board({ grid: { size: 50, visible: false, snap: false } });
    const current = board({ grid: { size: 50, visible: false, snap: true } });
    const merged = mergeEntity(before, after, current);
    expect(merged.grid).toEqual({ size: 50, visible: true, snap: true });
  });

  it("没碰过的键直接用 current 的值", () => {
    const before = board({ name: "旧" });
    const after = board({ name: "新" });
    const current = board({ name: "新", width: 1234 });
    const merged = mergeEntity(before, after, current);
    expect(merged.name).toBe("旧");
    expect(merged.width).toBe(1234);
  });

  it("带 id 的列表走 mergeListById", () => {
    const before = board({ tokens: [tok("a", 0), tok("b", 1)] });
    const after = board({ tokens: [tok("a", 0)] });
    const current = board({ tokens: [tok("a", 0), tok("z", 9)] });
    expect(mergeEntity(before, after, current).tokens).toEqual([
      tok("a", 0),
      tok("b", 1),
      tok("z", 9),
    ]);
  });

  it("字符串列表（如卡组成员）也按值对齐", () => {
    const before = board({ tags: ["x", "y"] });
    const after = board({ tags: ["x"] });
    const current = board({ tags: ["x", "w"] });
    expect(mergeEntity(before, after, current).tags).toEqual(["x", "y", "w"]);
  });

  it("无 id 的数组按整体值处理", () => {
    interface WithEntries {
      entries: { name: string; value: number }[];
    }
    const before: WithEntries = { entries: [{ name: "a", value: 1 }] };
    const after: WithEntries = { entries: [] };
    expect(mergeEntity(before, after, { entries: [] }).entries).toEqual([
      { name: "a", value: 1 },
    ]);
    // 用户之后换了一套 → 保留
    const current: WithEntries = { entries: [{ name: "z", value: 9 }] };
    expect(mergeEntity(before, after, current).entries).toEqual([
      { name: "z", value: 9 },
    ]);
  });

  it("防御：before 缺键时不把数组抹成 undefined", () => {
    // 理论上 before / after 同源不会缺键，这里锁住最坏情况下的行为
    const before = {} as { tokens: T[] };
    const after = { tokens: [tok("a", 0)] };
    const merged = mergeEntity(before, after, { tokens: [tok("a", 0)] });
    expect(merged.tokens).toEqual([tok("a", 0)]);
  });
});
