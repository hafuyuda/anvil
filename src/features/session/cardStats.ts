import { clamp01 } from "../../lib/math";

/**
 * 从卡牌上读取跑团用的数值。
 *
 * 设计约束：角色的一切数据都活在卡牌上，本模块只做「读取与解释」，
 * 不另建一套角色模型 —— 那会绕过 features/cards 这个共享核心。
 *
 * 约定是软的：卡上没有这些字段就不显示对应 UI，不强制、不报错。
 */

import type { Card, CardType } from "../../core/ipc";

export interface CardStat {
  key: string;
  label: string;
  value: number;
}

/** 当前生命的字段名约定 */
const HP_KEYS = ["hp", "生命", "生命值", "当前生命", "当前生命值"];
/** 生命上限的字段名约定 */
const MAX_HP_KEYS = ["maxhp", "最大生命", "最大生命值", "生命上限", "hp上限"];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_\-]/g, "");
}

/** 按约定键名在卡上找一个数值，找不到返回 null */
function findByKeys(
  card: Card,
  keys: string[],
): { key: string; value: number } | null {
  for (const [key, raw] of Object.entries(card.values ?? {})) {
    if (!keys.includes(normalizeKey(key))) continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n)) return { key, value: n };
  }
  return null;
}

export interface HpState {
  hp: number | null;
  max: number | null;
  /** 实际命中的字段名，写回时用。没有对应字段时为 null。 */
  hpKey: string | null;
  maxKey: string | null;
}

export function readHp(card: Card): HpState {
  const cur = findByKeys(card, HP_KEYS);
  const max = findByKeys(card, MAX_HP_KEYS);
  return {
    hp: cur?.value ?? null,
    max: max?.value ?? null,
    hpKey: cur?.key ?? null,
    maxKey: max?.key ?? null,
  };
}

/**
 * 列出卡上所有 number 类型的字段，供快捷检定使用。
 * 数据源是卡类型定义 —— 用户定义了什么属性，KP 就能检定什么。
 * Anvil 不预设技能名，也不推导调整值。
 */
export function listNumberStats(card: Card, cardType: CardType | null): CardStat[] {
  if (!cardType) return [];

  const out: CardStat[] = [];
  for (const field of cardType.fields ?? []) {
    if (field.ty.kind !== "number") continue;
    const raw = card.values?.[field.key];
    if (raw == null || raw === "") continue;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) continue;
    out.push({
      key: field.key,
      label: field.label || field.key,
      value: n,
    });
  }
  return out;
}

/** HP 百分比。没有上限时返回 null —— UI 就不画血条。 */
export function hpRatio(hp: number | null, max: number | null): number | null {
  if (hp == null || max == null || max <= 0) return null;
  return clamp01(hp / max);
}
