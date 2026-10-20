import { describe, expect, it } from "vitest";
import { pcToSourceLine, sourceLineToPc } from "./lineMap";

const SCRIPT = [
  "---",
  "title: 序章",
  "---",
  "",
  "=== 开场",
  "旁白一行",
  "",
  "**勇者**：谁在说话？",
  "* 出门",
  "-> 森林",
].join("\n");

// 结构行（跳过 frontmatter 与空行）应是：
// 0 === 开场 / 1 旁白一行 / 2 **勇者**：... / 3 * 出门 / 4 -> 森林
// 对应源码行 4 / 5 / 7 / 8 / 9

describe("sourceLineToPc", () => {
  // 语义：源码行 sourceLine 「之前」有多少条结构行（不含它自己）。
  // 搜索命中第 N 行时，用它算出「结构列表该停在第几条」。
  it("跳过 frontmatter 与空行", () => {
    expect(sourceLineToPc(SCRIPT, 0)).toBe(0);
    expect(sourceLineToPc(SCRIPT, 3)).toBe(0); // 前面全是 frontmatter
    expect(sourceLineToPc(SCRIPT, 4)).toBe(0); // === 开场 本身不算
    expect(sourceLineToPc(SCRIPT, 5)).toBe(1); // 前面有 1 条结构行
    expect(sourceLineToPc(SCRIPT, 6)).toBe(2); // 空行自己不计数
    expect(sourceLineToPc(SCRIPT, 7)).toBe(2); // 空行也不推进
    expect(sourceLineToPc(SCRIPT, 9)).toBe(4);
  });

  it("没有 frontmatter 时从第一行开始数", () => {
    const plain = "=== 开场\n旁白\n\n对白";
    expect(sourceLineToPc(plain, 0)).toBe(0);
    expect(sourceLineToPc(plain, 1)).toBe(1);
    expect(sourceLineToPc(plain, 3)).toBe(2);
  });

  it("越界的源码行不会崩", () => {
    expect(sourceLineToPc(SCRIPT, 9999)).toBe(5);
    expect(sourceLineToPc("", 3)).toBe(0);
  });
});

describe("pcToSourceLine", () => {
  it("换算回物理行", () => {
    expect(pcToSourceLine(SCRIPT, 0)).toBe(4);
    expect(pcToSourceLine(SCRIPT, 1)).toBe(5);
    expect(pcToSourceLine(SCRIPT, 2)).toBe(7);
    expect(pcToSourceLine(SCRIPT, 4)).toBe(9);
  });

  it("没有 frontmatter 时一致", () => {
    const plain = "=== 开场\n旁白\n\n对白";
    expect(pcToSourceLine(plain, 0)).toBe(0);
    expect(pcToSourceLine(plain, 2)).toBe(3);
  });

  it("越界的结构行落在最后一行", () => {
    expect(pcToSourceLine(SCRIPT, 99)).toBe(9);
    expect(pcToSourceLine("", 0)).toBe(0);
  });
});

describe("往返一致", () => {
  it("pc → 源码行 → pc 回到原值", () => {
    for (let pc = 0; pc < 5; pc++) {
      const line = pcToSourceLine(SCRIPT, pc);
      expect(sourceLineToPc(SCRIPT, line)).toBe(pc);
    }
  });

  it("含 \\r\\n 的文件同样成立", () => {
    const crlf = SCRIPT.split("\n").join("\r\n");
    for (let pc = 0; pc < 5; pc++) {
      expect(sourceLineToPc(crlf, pcToSourceLine(crlf, pc))).toBe(pc);
    }
  });
});
