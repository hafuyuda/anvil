import type { Command } from "../../lib/commands";

/**
 * 命令面板的结果排序。
 *
 * 静态命令与动态结果（卡牌检索）混在一起时的先后顺序。规则只有一条主线：
 *
 * - **标签以 query 开头、或某个关键词正好等于 query 的静态命令排最前。**
 *   否则输入「撤销」会被一堆正文里提到「撤销」的卡牌挤到下面，
 *   回车打开一张卡而不是执行撤销。
 * - **其余静态命令排在动态结果之后。** 这样输入一个卡名时，
 *   卡牌结果就在最上面 —— 这正是接入检索的目的。
 * - 动态结果不再按 query 二次过滤：源已经选好了，
 *   而命中可能来自字段或文档正文，label 里根本没有那个词。
 */
export function rankPaletteResults(
  commands: Command[],
  dynamic: Command[],
  query: string,
): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;
  if (dynamic.length === 0) return commands;

  const strong: Command[] = [];
  const weak: Command[] = [];
  for (const c of commands) {
    const isStrong =
      c.label.toLowerCase().startsWith(q) ||
      (c.keywords ?? []).some((k) => k.toLowerCase() === q);
    (isStrong ? strong : weak).push(c);
  }
  return [...strong, ...dynamic, ...weak];
}
