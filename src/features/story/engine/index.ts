/**
 * 剧本引擎的公共出口。
 *
 * 两个消费者：
 * 1. 预览（`features/story/play`）—— 直接 import 本模块；
 * 2. 导出阅读器 —— `scripts/build-reader-runtime.mjs` 以本文件为入口
 *    打包成 IIFE（全局名 `AnvilReader`），内联进导出的 HTML。
 *
 * 因此这里导出的东西必须是自包含的：不得引入 DOM / React / store / IPC。
 * 新增导出即等于扩大导出件的体积，非必要不加。
 */
export {
  MAX_STEPS,
  buildKnotIndex,
  chooseStep,
  continueStep,
  createInitialState,
  initValues,
  mergeGlue,
  varsToVariables,
  type HistoryEntry,
  type KnotIndex,
  type RuntimeState,
  type StepResult,
} from "./machine";
export { createReader, type Reader, type ReaderSource } from "./reader";
export { parseScript } from "../script/parser";
export { evalCondition, evalExpr } from "../script/eval";
export {
  applyEffects,
  type AppliedEffect,
  type ParsedEffect,
} from "../effects";
export { rollDice, validateDiceExpression } from "../../../lib/dice";
export type {
  ParsedScript,
  ScriptFrontmatter,
  ScriptLine,
} from "../script/types";
