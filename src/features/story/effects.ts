import type { FieldType, VariableDef } from "../../core/ipc";

export interface ParsedEffect {
  key: string;
  op: "=" | "+=" | "-=";
  rawValue: string;
  raw: string;
}

/**
 * 解析一行效果指令。
 * 支持：
 *   key = value
 *   key += 5
 *   key -= 5
 */
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

/**
 * 根据变量类型解析字面量。
 */
function parseLiteral(raw: string, ty: FieldType): unknown {
  switch (ty.kind) {
    case "bool":
      return raw === "true" || raw === "1" || raw === "是";
    case "number": {
      const n = Number(raw);
      return Number.isNaN(n) ? 0 : n;
    }
    default:
      // 去掉首尾引号
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        return raw.slice(1, -1);
      }
      return raw;
  }
}

/**
 * 应用效果到变量值表，返回新表。
 * 未知变量或无法解析的指令会被忽略（记在 errors 里）。
 */
export function applyEffects(
  values: Record<string, unknown>,
  effects: ParsedEffect[],
  variables: VariableDef[],
): { values: Record<string, unknown>; errors: string[] } {
  const next = { ...values };
  const errors: string[] = [];

  for (const e of effects) {
    const def = variables.find((v) => v.key === e.key);
    if (!def) {
      errors.push(`未知变量：${e.key}`);
      continue;
    }

    const current = next[e.key];

    if (e.op === "=") {
      next[e.key] = parseLiteral(e.rawValue, def.ty);
      continue;
    }

    if (def.ty.kind === "number") {
      const delta = Number(e.rawValue);
      if (Number.isNaN(delta)) {
        errors.push(`无法解析数值：${e.rawValue}`);
        continue;
      }
      const cur = typeof current === "number" ? current : 0;
      next[e.key] = e.op === "+=" ? cur + delta : cur - delta;
    } else if (def.ty.kind === "bool") {
      // 布尔不做加减，退化为赋值
      next[e.key] = parseLiteral(e.rawValue, def.ty);
    } else {
      // 文本
      const cur = typeof current === "string" ? current : "";
      const val = parseLiteral(e.rawValue, def.ty) as string;
      next[e.key] = e.op === "+=" ? cur + val : val;
    }
  }

  return { values: next, errors };
}

/**
 * 校验一组效果行，返回错误信息列表。
 */
export function validateEffects(
  effects: string[],
  variables: VariableDef[],
): string[] {
  const errors: string[] = [];
  const keys = new Set(variables.map((v) => v.key));

  for (const line of effects) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const p = parseEffect(trimmed);
    if (!p) {
      errors.push(`语法不合法：${trimmed}`);
      continue;
    }
    if (!keys.has(p.key)) {
      errors.push(`未知变量：${p.key}`);
    }
  }

  return errors;
}
