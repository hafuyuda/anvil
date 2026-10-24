/**
 * 棋盘回放引擎的唯一出口。
 *
 * 与剧本引擎（src/features/story/engine）同构：一份纯 TS 语义实现，
 * 多个消费者。目前两个 —— 应用内回放面板、导出件（单文件 HTML）。
 * 导出件复用 §16.4 的打包流水线（IIFE + include_str!）时也从这里打包。
 *
 * 1.0 只做 Windows 端（安卓端不在 1.0 范围）。
 */
export { applyEvent, deltaOf, isConsistent, replayAll, replayAt } from "./replay";
export type {
  BoardDeltas,
  LayerDelta,
  MoveDelta,
  PileState,
  ReplayState,
  TokenSnapshot,
} from "./types";
