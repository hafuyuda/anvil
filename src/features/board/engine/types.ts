import type { PileData } from "../../../core/ipc";

/**
 * 回放所需的 Token 快照。
 *
 * 只带「画得出来」的字段 —— 与 `Token` 的区别是不含 `value_overrides`
 * （那是死字段，全链路恒 `{}`，见审计 P4-1）。落子与删除两类事件要存它：
 * 落子用它重建，删除用它校验（回放倒退时能还原）。
 */
export interface TokenSnapshot {
  id: string;
  card_id: string | null;
  name_override?: string | null;
  x: number;
  y: number;
  w?: number | null;
  h?: number | null;
  rotation: number;
  layer: number;
  visible: boolean;
  face_down?: boolean;
  pile?: PileData | null;
}

/** 一次移动的前后坐标。只记 x/y —— 拖拽不改变尺寸与层序。 */
export interface MoveDelta {
  id: string;
  x: number;
  y: number;
}

/** 层序调整后的 layer 值。置顶/置底会重排一批，所以逐个记。 */
export interface LayerDelta {
  id: string;
  layer: number;
}

/** 卡盒动作后卡盒的剩余牌面。洗牌 / 重置 / 同步都会变它。 */
export interface PileState {
  remaining: string[];
  initial: string[];
  total: number;
}

/**
 * 各类事件携带的、足以回放的增量。
 *
 * 命名沿用事件 kind，但语义是「状态怎么变」而不是「发生了什么」——
 * 后者是 `summary` 的活，两者并存、互不替代。
 */
export interface BoardDeltas {
  /** 落子 / 复制 / 导入 / 建卡盒：新增了哪些 token，长什么样 */
  place?: { tokens: TokenSnapshot[] };
  /** 移动：从哪到哪 */
  move?: { from: MoveDelta[]; to: MoveDelta[] };
  /** 翻面：翻成什么状态（token_ids 已在 payload 上） */
  flip?: { face_down: boolean };
  /** 层序：调整后各自的 layer */
  layer?: { layers: LayerDelta[] };
  /** 删除：删了哪些（快照用于倒退还原与完整性校验） */
  delete?: { tokens: TokenSnapshot[] };
  /** 卡盒动作：抽出了什么、落位在哪、卡盒变成什么样 */
  pile?: {
    placed?: TokenSnapshot[];
    pile_after?: PileState;
  };
}

/** 回放产物。 */
export interface ReplayState {
  /** 第 `step` 步之后的棋盘 token 列表（按 layer 升序，与渲染顺序一致） */
  tokens: TokenSnapshot[];
  /**
   * 牌谱是否残缺 —— 任何一步缺 delta 都会置真。
   *
   * 0.4.0 之前落的牌谱没有坐标（信息已经丢了，补不回来），
   * 这类步骤只能跳过。UI 必须把它显示出来，不能假装回放是完整的。
   */
  degraded: boolean;
  /** 缺 delta 的步骤序号（0 基），供 UI 标红 */
  missingSteps: number[];
  /**
   * 回放终点与棋盘当前状态不一致时置真。
   *
   * 正常的完整牌谱，`replayAll` 的结果应当等于 `board.tokens`；
   * 不等说明有产生方漏记事件，是 bug 的信号，不是用户数据的问题。
   */
  inconsistent?: boolean;
}
