/**
 * 源码行 ↔ 结构行的互相换算。
 *
 * 结构模式的行列表是「跳过 frontmatter 与空行」后的紧凑序列，
 * 源码模式按物理行显示。两边的行号不是一回事，定位（knot 大纲跳转、
 * 搜索命中跳转）必须经过这里换算。
 *
 * 纯函数，无 IO —— 两个编辑器都依赖它，单独放并测住。
 */

/** 该行是否处于 frontmatter 内（含两条 `---` 界线本身）。 */
function inFrontmatter(lines: string[], i: number, wasIn: boolean): boolean {
  const t = lines[i].trim();
  if (wasIn) return t !== "---";
  // frontmatter 只在文件首行是 `---` 时开始
  return i === 0 && t === "---";
}

/** 源码行（0-based）→ 结构行索引。 */
export function sourceLineToPc(content: string, sourceLine: number): number {
  const lines = content.split(/\r?\n/);
  let pc = 0;
  let inFm = false;
  for (let i = 0; i < sourceLine && i < lines.length; i++) {
    const next = inFrontmatter(lines, i, inFm);
    if (!inFm && !next && lines[i].trim() !== "") pc++;
    inFm = next;
  }
  return pc;
}

/** 结构行索引 → 源码行（0-based）。越界时落在最后一行。 */
export function pcToSourceLine(content: string, pc: number): number {
  const lines = content.split(/\r?\n/);
  let count = 0;
  let inFm = false;
  for (let i = 0; i < lines.length; i++) {
    const next = inFrontmatter(lines, i, inFm);
    if (!inFm && !next && lines[i].trim() !== "") {
      if (count === pc) return i;
      count++;
    }
    inFm = next;
  }
  return Math.max(0, lines.length - 1);
}
