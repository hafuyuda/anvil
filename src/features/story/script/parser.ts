import type { ParsedScript, ScriptFrontmatter, ScriptLine } from "./types";

/**
 * 解析 Markdown 剧本。
 *
 * 语法（10 种行）：
 *   > 文本              → narration
 *   **说话人**（表情）：文本 → say
 *   *文本*              → action
 *   @bg 路径            → bg
 *   @bgm 文件           → bgm
 *   @sfx 文件           → sfx
 *   -> 场景名           → jump
 *   {表达式: 文本} / {表达式} → condition
 *   ~ 变量 操作符 值    → assign（操作符：= += -=）
 *   <>（单独一行）      → glue
 *
 * 空行分隔，frontmatter 用 --- 包围。
 * 不认识的语法：当 narration 处理，不丢数据。
 */
export function parseScript(source: string): ParsedScript {
  const lines = source.split(/\r?\n/);
  let i = 0;

  // frontmatter
  const frontmatter: ScriptFrontmatter = {};
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i].trim() !== "---") {
      const line = lines[i];
      const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (m) {
        const key = m[1];
        const raw = m[2].trim();
        if (key === "is_ending") {
          frontmatter.is_ending = raw === "true";
        } else if (key === "ending_name") {
          frontmatter.ending_name = stripQuotes(raw);
        } else if (key === "bg") {
          frontmatter.bg = stripQuotes(raw);
        } else if (key === "bgm") {
          frontmatter.bgm = stripQuotes(raw);
        }
      }
      i++;
    }
    if (i < lines.length) i++; // 跳过闭合 ---
  }

  const scriptLines: ScriptLine[] = [];

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      i++;
      continue;
    }

    // <> glue
    if (line === "<>") {
      scriptLines.push({ type: "glue" });
      i++;
      continue;
    }

    // -> jump
    const jump = line.match(/^->\s*(.+)$/);
    if (jump) {
      scriptLines.push({ type: "jump", target: jump[1].trim() });
      i++;
      continue;
    }

    // @bg / @bgm / @sfx
    const at = line.match(/^@(bg|bgm|sfx)\s+(.+)$/);
    if (at) {
      const kind = at[1] as "bg" | "bgm" | "sfx";
      const value = at[2].trim();
      if (kind === "bg") {
        scriptLines.push({ type: "bg", image: value });
      } else {
        scriptLines.push({ type: kind, file: value });
      }
      i++;
      continue;
    }

    // > narration
    if (line.startsWith("> ") || line === ">") {
      const text = line.slice(1).trim();
      scriptLines.push({ type: "narration", text });
      i++;
      continue;
    }

    // **speaker**（portrait）：text
    const say = line.match(
      /^\*\*([^*]+)\*\*(?:\s*[（(]([^）)]*)[）)])?\s*[:：]\s*(.*)$/,
    );
    if (say) {
      const speaker = say[1].trim();
      const portraitRaw = say[2]?.trim();
      const text = say[3] ?? "";
      scriptLines.push({
        type: "say",
        speaker,
        portrait: portraitRaw ? portraitRaw : undefined,
        text,
      });
      i++;
      continue;
    }

    // {expr: text} / {expr} condition
    if (line.startsWith("{") && line.endsWith("}")) {
      const cond = parseConditionBody(line.slice(1, -1));
      if (cond) {
        scriptLines.push({ type: "condition", expr: cond.expr, text: cond.text });
        i++;
        continue;
      }
    }

    // ~ assign
    const assign = line.match(/^~\s*(\S+?)\s*(\+=|-=|=)\s*(.+)$/);
    if (assign) {
      scriptLines.push({
        type: "assign",
        key: assign[1],
        op: assign[2] as "=" | "+=" | "-=",
        value: assign[3].trim(),
      });
      i++;
      continue;
    }

    // *action*
    const action = line.match(/^\*(.+)\*$/);
    if (action) {
      scriptLines.push({ type: "action", text: action[1].trim() });
      i++;
      continue;
    }

    // 不认识的语法：当 narration 处理，不丢数据
    scriptLines.push({ type: "narration", text: line });
    i++;
  }

  return { frontmatter, lines: scriptLines };
}

/**
 * 条件行内部分割：找第一个不在双引号内的冒号，
 * 前半是表达式，后半是显示文本（可空）。
 */
function parseConditionBody(inner: string): {
  expr: string;
  text: string;
} | null {
  let inStr = false;
  for (let j = 0; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') {
      inStr = !inStr;
    } else if (ch === ":" && !inStr) {
      const expr = inner.slice(0, j).trim();
      if (!expr) return null;
      return { expr, text: inner.slice(j + 1).trim() };
    }
  }
  const expr = inner.trim();
  return expr ? { expr, text: "" } : null;
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}
