/**
 * 骰子与数值解析的唯一真相源。
 * 所有掷骰相关的逻辑都应通过本模块，避免多份实现漂移。
 */

export const MIN_DICE_COUNT = 1;
export const MAX_DICE_COUNT = 100;
export const MIN_DICE_FACE = 2;
export const MAX_DICE_FACE = 1000;

export const DICE_ERROR_HINT = "表达式不合法，例：1d20、2d6+3、5";

export interface DiceResult {
  /** 规范化表达式，如 "1d20" / "2d6+3" / "5" */
  expr: string;
  /** 最终值（含修正） */
  result: number;
  /** 每颗骰的点数，不含修正。纯数字时为 [n] */
  detail: number[];
  /** 是否真的掷了骰（纯数字时为 false） */
  isRoll: boolean;
}

// 支持空格：2 d6 / 2d 6 / 2d6 + 3
const DICE_RE = /^(\d*)\s*d\s*(\d+)\s*([+-]\s*\d+)?$/i;
const PLAIN_NUMBER_RE = /^[+-]?\d+(\.\d+)?$/;

function formatExpr(count: number, face: number, mod: number): string {
  let s = `${count}d${face}`;
  if (mod > 0) s += `+${mod}`;
  else if (mod < 0) s += `${mod}`;
  return s;
}

function parseMod(raw: string | undefined): number {
  if (!raw) return 0;
  return Number(raw.replace(/\s/g, ""));
}

/**
 * 解析表达式并掷骰。非法返回 null。
 * 支持：NdM / dM / NdM+K / NdM-K / 纯数字（含小数）。
 */
export function rollDice(raw: string): DiceResult | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 纯数字
  if (PLAIN_NUMBER_RE.test(trimmed)) {
    const n = Number(trimmed);
    return { expr: trimmed, result: n, detail: [n], isRoll: false };
  }

  // 骰子
  const m = trimmed.match(DICE_RE);
  if (!m) return null;

  const count = m[1] ? Number(m[1]) : 1;
  const face = Number(m[2]);
  const mod = parseMod(m[3]);

  if (count < MIN_DICE_COUNT || count > MAX_DICE_COUNT) return null;
  if (face < MIN_DICE_FACE || face > MAX_DICE_FACE) return null;

  const detail: number[] = [];
  for (let i = 0; i < count; i++) {
    detail.push(Math.floor(Math.random() * face) + 1);
  }
  const sum = detail.reduce((a, b) => a + b, 0);

  return {
    expr: formatExpr(count, face, mod),
    result: sum + mod,
    detail,
    isRoll: true,
  };
}

/**
 * 只校验语法，不掷骰。合法返回规范化表达式，非法返回 null。
 * 用于编辑器实时校验，避免每次校验都产生随机数。
 */
export function validateDiceExpression(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (PLAIN_NUMBER_RE.test(trimmed)) return trimmed;

  const m = trimmed.match(DICE_RE);
  if (!m) return null;

  const count = m[1] ? Number(m[1]) : 1;
  const face = Number(m[2]);
  if (count < MIN_DICE_COUNT || count > MAX_DICE_COUNT) return null;
  if (face < MIN_DICE_FACE || face > MAX_DICE_FACE) return null;

  const mod = parseMod(m[3]);
  return formatExpr(count, face, mod);
}
