/**
 * 骰子与数值解析的唯一真相源。
 * 所有掷骰相关的逻辑都应通过本模块，避免多份实现漂移。
 *
 * 语法：
 *   表达式 := 项 (('+' | '-') 项)*
 *   项     := 骰子项 | 数字
 *   骰子项 := [个数]d<面数 | %> [取舍]
 *   取舍   := ('kh' 保留最高 | 'kl' 保留最低
 *            | 'dh' 丢弃最高 | 'dl' 丢弃最低) <数量>
 *
 * 例：1d20、2d6+3、4d6dl1、2d20kh1+5、1d20+1d4、d%、5
 */

export const MIN_DICE_COUNT = 1;
export const MAX_DICE_COUNT = 100;
export const MIN_DICE_FACE = 2;
export const MAX_DICE_FACE = 1000;
export const MIN_KEEP = 1;
export const MAX_KEEP = 100;

export const DICE_ERROR_HINT =
  "表达式不合法，例：1d20、2d6+3、4d6dl1、2d20kh1+5、d%、5";

/** 取舍方式：kh 保留最高 / kl 保留最低 / dh 丢弃最高 / dl 丢弃最低 */
export type KeepSel = "kh" | "kl" | "dh" | "dl";

export interface DiceResult {
  /** 规范化表达式，如 "1d20" / "2d6+3" / "4d6dl1" / "1d20+1d4" */
  expr: string;
  /** 最终值（含修正、含取舍） */
  result: number;
  /** 参与求和的骰点，不含修正。纯数字时为空数组 */
  detail: number[];
  /** 被取舍丢弃的骰点，没有取舍时为空数组 */
  dropped: number[];
  /**
   * 主骰原始点数（第一个骰子项被保留的第一颗骰）。
   * 用于自然 20 / 自然 100 这类「看裸骰」的判定。纯数字时为 null。
   */
  natural: number | null;
  /** 是否真的掷了骰（纯数字时为 false） */
  isRoll: boolean;
}

interface ParsedTerm {
  sign: 1 | -1;
  kind: "dice" | "number";
  // kind === "dice"
  count: number;
  face: number;
  /** 用户写的是 d% 而不是 d100，保留原书写形式 */
  percent: boolean;
  sel: KeepSel | null;
  selCount: number;
  // kind === "number"
  value: number;
}

const TERM_RE = /^(\d*)d(%|\d+)(?:(kh|kl|dh|dl)(\d+))?$/i;
const NUMBER_RE = /^\d+(\.\d+)?$/;

function normalize(raw: string): string {
  return raw.replace(/\s+/g, "").toLowerCase();
}

/**
 * 按顶层 +/- 切分成带符号的项。
 * 骰子项内部的取舍后缀（dl1 等）不含符号，不会误切。
 */
function splitTerms(src: string): { sign: 1 | -1; text: string }[] {
  const parts: { sign: 1 | -1; text: string }[] = [];
  let sign: 1 | -1 = 1;
  let start = 0;
  let i = 0;

  if (src[0] === "+") {
    i = 1;
    start = 1;
  } else if (src[0] === "-") {
    sign = -1;
    i = 1;
    start = 1;
  }

  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch !== "+" && ch !== "-") continue;
    parts.push({ sign, text: src.slice(start, i) });
    sign = ch === "+" ? 1 : -1;
    start = i + 1;
  }
  parts.push({ sign, text: src.slice(start) });
  return parts;
}

/**
 * 解析表达式。非法返回 null。
 * 解析与掷骰分离 —— 校验路径不产生随机数。
 */
export function parseDiceExpression(raw: string): ParsedTerm[] | null {
  const src = normalize(raw);
  if (!src) return null;

  const terms: ParsedTerm[] = [];
  for (const part of splitTerms(src)) {
    if (!part.text) return null;

    const m = part.text.match(TERM_RE);
    if (m) {
      const count = m[1] ? Number(m[1]) : 1;
      const percent = m[2] === "%";
      const face = percent ? 100 : Number(m[2]);
      const sel = m[3] ? ((m[3].toLowerCase() as KeepSel) ?? null) : null;
      const selCount = m[4] ? Number(m[4]) : 0;

      if (count < MIN_DICE_COUNT || count > MAX_DICE_COUNT) return null;
      if (face < MIN_DICE_FACE || face > MAX_DICE_FACE) return null;
      if (sel) {
        if (selCount < MIN_KEEP || selCount > MAX_KEEP) return null;
        // 取舍数量不能超过骰子个数，否则没有意义
        if (selCount > count) return null;
      }

      terms.push({
        sign: part.sign,
        kind: "dice",
        count,
        face,
        percent,
        sel,
        selCount,
        value: 0,
      });
      continue;
    }

    if (NUMBER_RE.test(part.text)) {
      terms.push({
        sign: part.sign,
        kind: "number",
        count: 0,
        face: 0,
        percent: false,
        sel: null,
        selCount: 0,
        value: Number(part.text),
      });
      continue;
    }

    return null;
  }

  return terms.length > 0 ? terms : null;
}

function rollTerm(term: ParsedTerm): { kept: number[]; dropped: number[] } {
  if (term.kind === "number") return { kept: [], dropped: [] };

  const raw: number[] = [];
  for (let i = 0; i < term.count; i++) {
    raw.push(Math.floor(Math.random() * term.face) + 1);
  }

  if (!term.sel) return { kept: raw, dropped: [] };

  const desc = [...raw].sort((a, b) => b - a);
  const asc = [...raw].sort((a, b) => a - b);
  const n = term.selCount;

  switch (term.sel) {
    case "kh":
      return { kept: desc.slice(0, n), dropped: desc.slice(n) };
    case "kl":
      return { kept: asc.slice(0, n), dropped: asc.slice(n) };
    case "dh":
      return { kept: desc.slice(n), dropped: desc.slice(0, n) };
    case "dl":
      return { kept: asc.slice(n), dropped: asc.slice(0, n) };
  }
}

function formatTerm(term: ParsedTerm): string {
  if (term.kind === "number") return String(term.value);
  // 裸写 d% 保持原样，不补写成 1d100 —— 用户写的就是他要看的
  if (term.percent && term.count === 1) return "d%";
  let s = `${term.count}d${term.percent ? "%" : term.face}`;
  if (term.sel) s += `${term.sel}${term.selCount}`;
  return s;
}

function formatExpr(terms: ParsedTerm[]): string {
  let s = "";
  for (const term of terms) {
    const body = formatTerm(term);
    if (!s) s = term.sign === 1 ? body : `-${body}`;
    else s += term.sign === 1 ? `+${body}` : `-${body}`;
  }
  return s;
}

/** 解析表达式并掷骰。非法返回 null。 */
export function rollDice(raw: string): DiceResult | null {
  const terms = parseDiceExpression(raw);
  if (!terms) return null;

  const detail: number[] = [];
  const dropped: number[] = [];
  let sum = 0;
  let natural: number | null = null;
  let isRoll = false;

  for (const term of terms) {
    if (term.kind === "number") {
      sum += term.sign * term.value;
      continue;
    }
    const rolled = rollTerm(term);
    const sub = rolled.kept.reduce((a, b) => a + b, 0);
    sum += term.sign * sub;
    detail.push(...rolled.kept);
    dropped.push(...rolled.dropped);
    // 主骰 = 第一个骰子项，其裸值取被保留的第一颗
    if (!isRoll) natural = rolled.kept[0] ?? null;
    isRoll = true;
  }

  return {
    expr: formatExpr(terms),
    result: sum,
    detail,
    dropped,
    natural,
    isRoll,
  };
}

/**
 * 只校验语法，不掷骰。合法返回规范化表达式，非法返回 null。
 * 用于编辑器实时校验，避免每次校验都产生随机数。
 */
export function validateDiceExpression(raw: string): string | null {
  const terms = parseDiceExpression(raw);
  if (!terms) return null;
  return formatExpr(terms);
}
