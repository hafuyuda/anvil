import type { FieldType, VariableDef } from "../../core/ipc";
import { rollDice, validateDiceExpression } from "../../lib/dice";

export interface ParsedEffect {
  key: string;
  op: "=" | "+=" | "-=";
  rawValue: string;
  raw: string;
}

export interface AppliedEffect {
  key: string;
  op: ParsedEffect["op"];
  raw: string;
  resolved: number | boolean | string;
  isRoll: boolean;
  rollDetail?: number[];
}

export interface ApplyResult {
  values: Record<string, unknown>;
  errors: string[];
  applied: AppliedEffect[];
}

export function parseEffect(line: string): ParsedEffect | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const m = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+=|-=|=)\s*(.+)$/);
  if (!m) return null;

  return {
    key: m[1],
    op: m[2] as ParsedEffect["op"],
    rawValue: m[3].trim(),
    raw: trimmed,
  };
}

export function parseEffects(effects: unknown): ParsedEffect[] {
  if (!Array.isArray(effects)) return [];
  const out: ParsedEffect[] = [];
  for (const e of effects) {
    if (typeof e !== "string") continue;
    const p = parseEffect(e);
    if (p) out.push(p);
  }
  return out;
}

function parseLiteral(
  raw: string,
  ty: FieldType,
): { value: unknown; detail: number[]; isRoll: boolean } | null {
  switch (ty.kind) {
    case "bool": {
      const t = raw.toLowerCase();
      return {
        value: t === "true" || t === "1" || t === "是",
        detail: [],
        isRoll: false,
      };
    }
    case "number": {
      const r = rollDice(raw);
      if (!r) return null;
      return { value: r.result, detail: r.detail, isRoll: r.isRoll };
    }
    default: {
      let v = raw;
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return { value: v, detail: [], isRoll: false };
    }
  }
}

export function applyEffects(
  values: Record<string, unknown>,
  effects: ParsedEffect[],
  variables: VariableDef[],
): ApplyResult {
  const next = { ...values };
  const errors: string[] = [];
  const applied: AppliedEffect[] = [];

  for (const e of effects) {
    const def = variables.find((v) => v.key === e.key);
    if (!def) {
      errors.push(`未知变量：${e.key}`);
      continue;
    }

    const current = next[e.key];

    if (e.op === "=") {
      const parsed = parseLiteral(e.rawValue, def.ty);
      if (!parsed) {
        errors.push(`无法解析值：${e.rawValue}`);
        continue;
      }
      next[e.key] = parsed.value;
      applied.push({
        key: e.key,
        op: e.op,
        raw: e.raw,
        resolved: parsed.value as number | boolean | string,
        isRoll: parsed.isRoll,
        rollDetail: parsed.isRoll ? parsed.detail : undefined,
      });
      continue;
    }

    if (def.ty.kind === "number") {
      const parsed = rollDice(e.rawValue);
      if (!parsed) {
        errors.push(`无法解析数值：${e.rawValue}`);
        continue;
      }
      const cur = typeof current === "number" ? current : 0;
      const nextVal =
        e.op === "+=" ? cur + parsed.result : cur - parsed.result;
      next[e.key] = nextVal;
      applied.push({
        key: e.key,
        op: e.op,
        raw: e.raw,
        resolved: parsed.result,
        isRoll: parsed.isRoll,
        rollDetail: parsed.isRoll ? parsed.detail : undefined,
      });
    } else if (def.ty.kind === "bool") {
      const parsed = parseLiteral(e.rawValue, def.ty);
      if (!parsed) continue;
      next[e.key] = parsed.value;
      applied.push({
        key: e.key,
        op: e.op,
        raw: e.raw,
        resolved: parsed.value as boolean,
        isRoll: false,
      });
    } else {
      const cur = typeof current === "string" ? current : "";
      const parsed = parseLiteral(e.rawValue, def.ty);
      if (!parsed) continue;
      const val = String(parsed.value);
      next[e.key] = e.op === "+=" ? cur + val : val;
      applied.push({
        key: e.key,
        op: e.op,
        raw: e.raw,
        resolved: val,
        isRoll: false,
      });
    }
  }

  return { values: next, errors, applied };
}

export function validateEffects(
  effects: string[],
  variables: VariableDef[],
): string[] {
  const errors: string[] = [];
  const varsByKey = new Map(variables.map((v) => [v.key, v]));

  for (const line of effects) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const p = parseEffect(trimmed);
    if (!p) {
      errors.push(`语法不合法：${trimmed}`);
      continue;
    }
    const def = varsByKey.get(p.key);
    if (!def) {
      errors.push(`未知变量：${p.key}`);
      continue;
    }

    // 骰子语法校验（只针对 number 类型 + 加减操作）
    if (def.ty.kind === "number") {
      if (!validateDiceExpression(p.rawValue)) {
        errors.push(`无法解析数值或骰子：${p.rawValue}`);
      }
    }
  }

  return errors;
}