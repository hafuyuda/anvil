import type {
  InlineCond,
  ParsedScript,
  ScriptFrontmatter,
  ScriptKnot,
  ScriptLine,
} from "./types";

/**
 * 解析 Markdown 剧本（weave 语法，16 种行）。
 *
 *   === 名             → knot（子 knot 用 `铁匠铺.夜`）
 *   VAR 名 = 字面量     → var
 *   > 文本             → narration
 *   **角色**（表情）：文本 → say
 *   *文本*             → action
 *   @bg / @bgm / @sfx  → bg / bgm / sfx
 *   @scene 卡名        → scene_ref（记入当前 knot）
 *   @actor 卡名        → actor_ref（记入当前 knot）
 *   -> 目标            → jump（目标 = knot 名 / END）
 *   * 选项文本         → choice
 *   - / - 文本         → gather
 *   {表达式: 文本}     → condition（整行，假时跳过）
 *   {表达式: A|B}      → 行内条件（text 保留原文，解析结果入 inline）
 *   ~ 变量 操作符 值    → assign（= += -=）
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
  const knots: Record<string, ScriptKnot> = {};
  const vars: { key: string; literal: string }[] = [];
  let currentKnot: ScriptKnot | null = null;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      i++;
      continue;
    }

    // === knot
    const knot = line.match(/^===\s*(.+?)\s*$/);
    if (knot) {
      const k: ScriptKnot = { name: knot[1], pc: scriptLines.length, actors: [] };
      knots[k.name] = k;
      currentKnot = k;
      scriptLines.push({ type: "knot", name: k.name });
      i++;
      continue;
    }

    // VAR key = literal
    const varDecl = line.match(/^VAR\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
    if (varDecl) {
      vars.push({ key: varDecl[1], literal: varDecl[2].trim() });
      scriptLines.push({ type: "var", key: varDecl[1], literal: varDecl[2].trim() });
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

    // @bg / @bgm / @sfx / @scene / @actor
    const at = line.match(/^@(bg|bgm|sfx|scene|actor)\s+(.+)$/);
    if (at) {
      const kind = at[1];
      const value = at[2].trim();
      if (kind === "bg") {
        scriptLines.push({ type: "bg", image: value });
      } else if (kind === "bgm" || kind === "sfx") {
        scriptLines.push({ type: kind, file: value });
      } else if (kind === "scene") {
        if (currentKnot) currentKnot.scene = value;
        scriptLines.push({ type: "scene_ref", cardName: value });
      } else {
        if (currentKnot) currentKnot.actors.push(value);
        scriptLines.push({ type: "actor_ref", cardName: value });
      }
      i++;
      continue;
    }

    // > narration
    if (line.startsWith("> ") || line === ">") {
      const text = line.slice(1).trim();
      scriptLines.push(withInline({ type: "narration", text }));
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
      scriptLines.push(
        withInline({
          type: "say",
          speaker,
          portrait: portraitRaw ? portraitRaw : undefined,
          text,
        }),
      );
      i++;
      continue;
    }

    // {…} 独占一行：含 | → 行内条件显示行；否则整行条件
    if (line.startsWith("{") && line.endsWith("}")) {
      const inner = line.slice(1, -1);
      const inline = parseInlineInner(inner);
      if (inline) {
        scriptLines.push({ type: "narration", text: line, inline: [inline] });
        i++;
        continue;
      }
      const cond = parseConditionBody(inner);
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

    // * 选项文本（* 后有空白）
    const choice = line.match(/^\*\s+(.+)$/);
    if (choice) {
      scriptLines.push({ type: "choice", label: choice[1].trim() });
      i++;
      continue;
    }

    // *action*（* 后无空白、行尾闭合）
    const action = line.match(/^\*(.+)\*$/);
    if (action) {
      scriptLines.push(withInline({ type: "action", text: action[1].trim() }));
      i++;
      continue;
    }

    // - gather（`-` 独占或 `- 文本`；`->` 已在上面消费）
    const gather = line.match(/^-(?:\s+(.*))?$/);
    if (gather) {
      scriptLines.push({ type: "gather", text: (gather[1] ?? "").trim() });
      i++;
      continue;
    }

    // 不认识的语法：当 narration 处理，不丢数据
    scriptLines.push(withInline({ type: "narration", text: line }));
    i++;
  }

  const choiceGroups = buildChoiceGroups(scriptLines);

  return { frontmatter, lines: scriptLines, knots, vars, choiceGroups };
}

/**
 * choice 组：连续 `*` 行构成一组。每个选项的 body 是其后、
 * 下一个 `*` / `-`（gather）/ `===`（knot）/ EOF 之前的所有行。
 * gatherPc 是组后第一个 gather 行的 pc（没有则 null）。
 * key = 组内第一个 * 行的 pc。
 */
function buildChoiceGroups(
  lines: ScriptLine[],
): Record<number, { choices: { label: string; bodyStart: number; bodyEnd: number }[]; gatherPc: number | null }> {
  const groups: Record<number, { choices: { label: string; bodyStart: number; bodyEnd: number }[]; gatherPc: number | null }> = {};
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type !== "choice") {
      i++;
      continue;
    }
    const groupStart = i;
    const choices: { label: string; bodyStart: number; bodyEnd: number }[] = [];
    let j = i;
    let terminated = false;
    while (j < lines.length && lines[j].type === "choice") {
      // body 结束：下一个 choice / gather / knot
      let k = j + 1;
      while (
        k < lines.length &&
        lines[k].type !== "choice" &&
        lines[k].type !== "gather" &&
        lines[k].type !== "knot"
      ) {
        k++;
      }
      choices.push({ label: choiceLabel(lines[j]), bodyStart: j + 1, bodyEnd: k - 1 });
      if (k < lines.length && lines[k].type === "choice") {
        j = k; // 组内下一个选项
        continue;
      }
      // 组结束：gather / knot / EOF
      const gatherPc = k < lines.length && lines[k].type === "gather" ? k : null;
      groups[groupStart] = { choices, gatherPc };
      j = k;
      terminated = true;
      break;
    }
    i = terminated ? j : i + 1;
  }
  return groups;
}

function choiceLabel(line: ScriptLine): string {
  return line.type === "choice" ? line.label : "";
}

/** 文本行行内条件扫描：text 保留原文，解析结果入 inline。 */
function withInline(line: ScriptLine): ScriptLine {
  if (
    line.type !== "narration" &&
    line.type !== "say" &&
    line.type !== "action"
  ) {
    return line;
  }
  const inline = scanInlineConds(line.text);
  return inline.length > 0 ? { ...line, inline } : line;
}

/** 扫描文本中所有 `{expr: A|B}` 跨度（`|` 不在双引号内时才是分隔符）。 */
function scanInlineConds(text: string): InlineCond[] {
  const out: InlineCond[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    const close = text.indexOf("}", open + 1);
    if (close === -1) break;
    const cond = parseInlineInner(text.slice(open + 1, close));
    if (cond) out.push(cond);
    i = close + 1;
  }
  return out;
}

/** `{表达式: A|B}` 花括号内部分割。无 `|` 时返回 null（整行条件场景）。 */
export function parseInlineInner(inner: string): InlineCond | null {
  // 第一个不在双引号内的冒号
  let colon = -1;
  let inStr = false;
  for (let j = 0; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') {
      inStr = !inStr;
    } else if (ch === ":" && !inStr) {
      colon = j;
      break;
    }
  }
  if (colon === -1) return null;
  const expr = inner.slice(0, colon).trim();
  if (!expr) return null;
  // 冒号后第一个不在双引号内的竖线
  let pipe = -1;
  inStr = false;
  for (let j = colon + 1; j < inner.length; j++) {
    const ch = inner[j];
    if (ch === '"') {
      inStr = !inStr;
    } else if (ch === "|" && !inStr) {
      pipe = j;
      break;
    }
  }
  if (pipe === -1) return null;
  return {
    expr,
    then: inner.slice(colon + 1, pipe).trim(),
    else: inner.slice(pipe + 1).trim(),
  };
}

/**
 * 整行条件行内部分割：找第一个不在双引号内的冒号，
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
