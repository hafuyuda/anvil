/**
 * 跑团规则集。
 *
 * 边界声明：这里只有「把一次掷骰结果映射到等级标签」的查表逻辑。
 * Anvil 不回答「这一击命中吗」—— 后者需要读取武器、护甲、状态并推导，
 * 属于规则引擎，本项目明确不做。规则集是可编辑的配置，不是引擎。
 */

import type { OutcomeLevel } from "../../core/ipc";

export type RuleSetId = "generic" | "coc7" | "dnd5e";

export interface RuleSetDef {
  id: RuleSetId;
  name: string;
  /** 主骰默认表达式 */
  defaultExpr: string;
  /** 判定目标的含义与输入提示 */
  targetLabel: string;
  targetPlaceholder: string;
  /** 是否分档（困难 / 极限成功） */
  tiered: boolean;
  /** 目标值方向：under = 掷骰须 ≤ 目标，over = 掷骰须 ≥ 目标 */
  direction: "under" | "over";
  /** 快捷掷骰按钮 */
  quick: { label: string; expr: string }[];
  /**
   * 先攻表达式。null 表示该规则集的先攻不靠掷骰 ——
   * COC 7 版按 DEX 排序，Anvil 不做推导，让 KP 手工录入。
   */
  initiativeExpr: string | null;
}

export const RULE_SETS: RuleSetDef[] = [
  {
    id: "generic",
    name: "泛用",
    defaultExpr: "1d20",
    targetLabel: "难度",
    targetPlaceholder: "例如 12",
    tiered: false,
    direction: "over",
    quick: [
      { label: "d20", expr: "1d20" },
      { label: "2d6", expr: "2d6" },
      { label: "d100", expr: "1d100" },
    ],
    initiativeExpr: "1d20",
  },
  {
    id: "coc7",
    name: "克苏鲁的呼唤 7 版",
    defaultExpr: "1d100",
    targetLabel: "技能值",
    targetPlaceholder: "例如 60",
    tiered: true,
    direction: "under",
    quick: [
      { label: "d%", expr: "d%" },
      { label: "1d4", expr: "1d4" },
      { label: "1d6", expr: "1d6" },
      { label: "1d10", expr: "1d10" },
    ],
    // COC 7 版先攻按 DEX 排序，不掷骰 —— 交给 KP 手工录入
    initiativeExpr: null,
  },
  {
    id: "dnd5e",
    name: "龙与地下城 5 版",
    defaultExpr: "1d20",
    targetLabel: "DC",
    targetPlaceholder: "例如 15",
    tiered: false,
    direction: "over",
    quick: [
      { label: "先攻", expr: "1d20" },
      { label: "优势", expr: "2d20kh1" },
      { label: "劣势", expr: "2d20kl1" },
      { label: "1d8", expr: "1d8" },
    ],
    initiativeExpr: "1d20",
  },
];

export function getRuleSet(id: string | null | undefined): RuleSetDef {
  return RULE_SETS.find((r) => r.id === id) ?? RULE_SETS[0];
}

export interface Outcome {
  level: OutcomeLevel;
  label: string;
}

export interface JudgeInput {
  ruleSet: RuleSetId;
  /** 主骰裸值，用于自然 20 / 自然 100 */
  natural: number | null;
  /** 含修正的最终值 */
  result: number;
  /** 目标值。coc7 为技能值，dnd5e 与 generic 为 DC */
  target: number | null;
}

/** 判定一次掷骰。无目标值时返回 null —— 不判定也是一种合法状态。 */
export function judge(input: JudgeInput): Outcome | null {
  const { target, natural, result } = input;
  if (target == null) return null;

  switch (input.ruleSet) {
    case "coc7":
      return judgeCoc7(natural, target);
    case "dnd5e":
      return judgeDnd5e(natural, result, target);
    default:
      return result >= target
        ? { level: "success", label: "成功" }
        : { level: "failure", label: "失败" };
  }
}

/**
 * COC 7 版判定。
 * 自然 1 = 大成功，自然 100 = 大失败；
 * 极限 ≤ 技能值/5，困难 ≤ 技能值/2，普通 ≤ 技能值；
 * 失败时 96-99 且技能值不足 50 → 升级为大失败（技能值 50 以上只有 100 才算）。
 */
function judgeCoc7(natural: number | null, target: number): Outcome {
  const n = natural ?? 0;

  if (n === 1) return { level: "critical", label: "大成功" };
  if (n === 100) return { level: "fumble", label: "大失败" };

  if (n <= Math.floor(target / 5)) return { level: "extreme", label: "极限成功" };
  if (n <= Math.floor(target / 2)) return { level: "hard", label: "困难成功" };
  if (n <= target) return { level: "success", label: "成功" };

  if (n >= 96 && target < 50) return { level: "fumble", label: "大失败" };
  return { level: "failure", label: "失败" };
}

/** D&D 5 版判定：裸骰 20 自动成功，裸骰 1 自动失败，其余对 DC。 */
function judgeDnd5e(
  natural: number | null,
  result: number,
  dc: number,
): Outcome {
  const n = natural ?? 0;

  if (n === 20) return { level: "critical", label: "大成功" };
  if (n === 1) return { level: "fumble", label: "大失败" };

  return result >= dc
    ? { level: "success", label: "成功" }
    : { level: "failure", label: "失败" };
}

/** 判定等级 → 展示色调。组件自行决定怎么用这个 token。 */
export type OutcomeTone = "positive" | "negative" | "warn" | "neutral";

export function outcomeTone(level: OutcomeLevel): OutcomeTone {
  switch (level) {
    case "critical":
    case "extreme":
    case "hard":
    case "success":
      return "positive";
    case "fumble":
      return "negative";
    case "failure":
      return "warn";
    default:
      return "neutral";
  }
}
