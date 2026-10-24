import { clamp } from "./math";

/**
 * 数据级撤销的合并原语。
 *
 * 背景：撤销栈本身是 LIFO 的，机制没问题。问题出在调用方的 restore
 * 普遍写成「把动作前的整个实体写回去」——那样只要用户在撤销前又动了
 * 同一个实体（拖了下别的 Token、改了棋盘宽度），后来的编辑就会被旧
 * 快照整个吞掉。
 *
 * 这里的原语把 restore 改成「只回滚本次改动碰过的部分」：合并时始终
 * 以 store 里的当前状态为底，逐键判断「当前值是否仍处于动作完成那一刻
 * 的状态」——是，才回滚到动作前；不是，说明用户之后又改过，保留用户的
 * 版本。列表则按 id 对齐，本动作删掉的按原索引插回。
 */

/** 深度相等。实体都是纯 JSON 数据，逐键比较足够，也不受键序影响。 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

/**
 * 把一组「原索引 + 元素」插回基础列表，保持被删元素原来的相对位置。
 * 索引超出当前长度时贴到末尾（当前列表可能已经被用户删短了）。
 */
export function insertAtIndices<T>(
  base: T[],
  inserts: { item: T; index: number }[],
): T[] {
  if (inserts.length === 0) return base;
  const byIndex = new Map<number, T[]>();
  for (const ins of inserts) {
    const idx = clamp(ins.index, 0, base.length);
    const arr = byIndex.get(idx) ?? [];
    arr.push(ins.item);
    byIndex.set(idx, arr);
  }
  const out: T[] = [];
  for (let i = 0; i <= base.length; i++) {
    for (const item of byIndex.get(i) ?? []) out.push(item);
    if (i < base.length) out.push(base[i]);
  }
  return out;
}

/** 列表元素的身份。Token 用 id，卡组成员用卡牌 id 字符串。 */
export type IdOf<T> = (item: T) => string;

export const idOfById: IdOf<{ id: string }> = (t) => t.id;
export const idOfString: IdOf<string> = (t) => t;

/**
 * 按 id 把 before 合并回 current（撤销方向）。
 *
 * 对 current 里的每条：
 *  - 本动作没碰过（after 里没有）→ 原样保留
 *  - 本动作新增的、用户没再改过 → 撤掉
 *  - 本动作改过它、用户没再动 → 回滚成 before 版本
 *  - 本动作改过它、用户之后又改了 → 保留用户的版本
 *
 * 另外，本动作删掉的（before 有、after 与 current 都没有）按原索引插回。
 *
 * 重做时把 before / after 对调调用即可，语义对称。
 */
export function mergeListById<T>(
  before: T[],
  after: T[],
  current: T[],
  idOf: IdOf<T>,
): T[] {
  const beforeMap = new Map(before.map((t) => [idOf(t), t]));
  const afterMap = new Map(after.map((t) => [idOf(t), t]));
  const currentIds = new Set(current.map((t) => idOf(t)));

  const kept: T[] = [];
  for (const cur of current) {
    const id = idOf(cur);
    const b = beforeMap.get(id);
    const a = afterMap.get(id);
    if (a === undefined) {
      kept.push(cur);
    } else if (b === undefined) {
      // 本动作新增的。用户没再改过才撤掉，改过就留下
      if (!deepEqual(cur, a)) kept.push(cur);
    } else if (deepEqual(cur, a)) {
      kept.push(b);
    } else {
      kept.push(cur);
    }
  }

  const inserts: { item: T; index: number }[] = [];
  before.forEach((t, i) => {
    const id = idOf(t);
    if (!afterMap.has(id) && !currentIds.has(id)) {
      inserts.push({ item: t, index: i });
    }
  });
  return insertAtIndices(kept, inserts);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 列表是否能按 id 合并：字符串数组，或首元素带字符串 id 的对象数组。 */
function isIdList(arr: unknown[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  if (typeof first === "string") return true;
  return (
    typeof first === "object" &&
    first !== null &&
    typeof (first as { id?: unknown }).id === "string"
  );
}

function guessIdOf<T>(arr: T[]): IdOf<T> {
  return (typeof arr[0] === "string" ? idOfString : idOfById) as IdOf<T>;
}

/**
 * 实体级合并：把 before 合并回 current。
 *
 * 只遍历 before / after 之间改过的键，没碰过的键直接用 current 的值。
 * 嵌套的普通对象递归合并（棋盘 grid 改可见性时不会连带吞掉之后改的吸附），
 * 带 id 的列表走 mergeListById，其余按 opaque 值整体判断。
 */
export function mergeEntity<T extends object>(
  before: T,
  after: T,
  current: T,
): T {
  const out: Record<string, unknown> = {
    ...(current as Record<string, unknown>),
  };
  const keys = new Set([
    ...Object.keys(before as Record<string, unknown>),
    ...Object.keys(after as Record<string, unknown>),
  ]);
  for (const k of keys) {
    if (!(k in (after as Record<string, unknown>))) continue;
    const b = (before as Record<string, unknown>)[k];
    const a = (after as Record<string, unknown>)[k];
    if (deepEqual(b, a)) continue; // 本动作没改这个键
    const c = (current as Record<string, unknown>)[k];
    if (Array.isArray(b) && Array.isArray(a) && Array.isArray(c) && isIdList(b)) {
      out[k] = mergeListById(b, a, c, guessIdOf(b));
    } else if (isPlainObject(b) && isPlainObject(a)) {
      out[k] = mergeEntity(
        b,
        a,
        isPlainObject(c) ? c : (a as Record<string, unknown>),
      );
    } else {
      // 防御：before 里没有这个键时（本动作新增的键）不回写 undefined，
      // 否则可能把一整个数组抹掉
      if (b === undefined && a !== undefined && deepEqual(c, a)) continue;
      out[k] = deepEqual(c, a) ? b : c;
    }
  }
  return out as T;
}
