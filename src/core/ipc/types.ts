// ============ Card ============

export type CardId = string;
export type TypeId = string;

export interface Card {
  id: CardId;
  type_id: TypeId;
  name: string;
  values: Record<string, unknown>;
  image_crop_override?: CropRect | null;
  created_at: number;
  updated_at: number;
}

export type FieldType =
  | { kind: "text" }
  | { kind: "rich_text" }
  | { kind: "number" }
  | { kind: "bool" }
  | { kind: "date" }
  | { kind: "color" }
  | { kind: "enum"; options: string[] }
  | { kind: "multi_enum"; options: string[] }
  | { kind: "tags" }
  | { kind: "ref"; target_types: string[] }
  | { kind: "image" }
  | { kind: "url" }
  | { kind: "json" };

export interface FieldDef {
  key: string;
  label: string;
  ty: FieldType;
  required: boolean;
  default?: unknown;
  group?: string | null;
  order: number;
  deprecated: boolean;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlotBinding {
  /** 单字段映射：card.values[source] */
  source?: string | null;
  /** 多字段映射（body 用）：card.values[values[i]] */
  values: string[];
  /** 覆盖该槽位的默认标签（如 ATK / HP） */
  label?: string | null;
}

export interface CardFrameConfig {
  style?: string | null;
  bindings: Record<string, SlotBinding>;
  foil_field?: string | null;
  foil_values: string[];
  image_crop?: CropRect | null;
  foil_style?: string | null;
}

export interface CardType {
  id: TypeId;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  fields: FieldDef[];
  allowed_relation_kinds: string[];
  views: string[];
  card_frame?: CardFrameConfig | null;
  card_back?: string | null;
  created_at: number;
  updated_at: number;
}

// ============ Relation ============

export interface RelationKind {
  id: string;
  name: string;
  inverse_name?: string | null;
  directed: boolean;
  color?: string | null;
  from_types: TypeId[];
  to_types: TypeId[];
  fields: FieldDef[];
  created_at: number;
  updated_at: number;
}

export interface Relation {
  id: string;
  from: CardId;
  to: CardId;
  kind: string;
  label?: string | null;
  meta: Record<string, unknown>;
  created_at: number;
}

// ============ CardGroup ============

export interface CardGroup {
  id: string;
  name: string;
  description?: string | null;
  card_ids: string[];
  created_at: number;
  updated_at: number;
}

// ============ Scenario ============

export interface VariableDef {
  key: string;
  label: string;
  ty: FieldType;
  default?: unknown;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string | null;
  /** 入口 knot。为空时运行时取文件名字典序第一个文件的第一个 knot。 */
  entry_knot?: string | null;
  created_at: number;
  updated_at: number;
}

// ============ Board ============

export interface GridConfig {
  size: number;
  offset_x: number;
  offset_y: number;
  visible: boolean;
  snap: boolean;
  shape?: string;
}

export interface PileData {
  group_id: string;
  label: string;
  remaining: string[];
  initial: string[];
  total: number;
}

export interface Token {
  id: string;
  card_id?: CardId | null;
  name_override?: string | null;
  value_overrides: Record<string, unknown>;
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

export interface Board {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: GridConfig;
  background?: string | null;
  tokens: Token[];
  show_relations?: boolean;
  visible_relation_kinds?: string[];
  created_at: number;
  updated_at: number;
}

// ============ Session ============

/** 事件可见性。undefined / null 等价于 public（旧数据无该字段）。 */
export type EventVisibility = "public" | "secret";

/** 视图模式：KP 全景 / 玩家公开视图。 */
export type SessionViewMode = "gm" | "player";

export interface InitiativeEntry {
  token_id?: string | null;
  card_id?: string | null;
  name: string;
  value: number;
  is_pc?: boolean;
}

export interface InitiativeTracker {
  round: number;
  turn_index: number;
  active: boolean;
  entries: InitiativeEntry[];
}

export interface Session {
  id: string;
  name: string;
  board_id?: string | null;
  state: Record<string, unknown>;
  /** 规则集 id：generic / coc7 / dnd5e。只决定掷骰结果呈现，不做规则求解。 */
  rule_set?: string | null;
  /** 先攻追踪。null 表示本会话不追踪战斗。 */
  tracker?: InitiativeTracker | null;
  tokens: Token[];
  created_at: number;
  updated_at: number;
}

export interface GameEvent {
  seq: number;
  at: number;
  kind: string;
  payload: unknown;
  note?: string | null;
  visibility?: EventVisibility | null;
  /** 秘密事件是否已被揭示。揭示后本体仍是 secret，公开的是另追加的 chat.reveal 副本。 */
  revealed?: boolean;
}

export type ChatEventKind =
  | "chat.say"
  | "chat.action"
  | "chat.roll"
  | "chat.narration"
  | "chat.ooc"
  | "chat.whisper"
  | "chat.reveal";

export type SystemEventKind =
  | "session.start"
  | "session.end"
  | "token.move"
  | "state.set"
  | "note"
  | "combat.turn"
  | "combat.round"
  | "board.step";

export type AnyEventKind = ChatEventKind | SystemEventKind;

/** 判定结果等级。由规则集配置驱动，仅做结果标签化。 */
export type OutcomeLevel =
  | "critical"
  | "extreme"
  | "hard"
  | "success"
  | "failure"
  | "fumble";

export interface RollInfo {
  expr: string;
  result: number;
  /** 参与求和的骰点 */
  detail: number[];
  /** 被 kh/kl/dh/dl 丢弃的骰点 */
  dropped?: number[];
  /** 主骰原始点数，用于自然 20 / 自然 100 判定 */
  natural?: number | null;
  /**
   * 判定目标。语义由规则集决定：coc7 是技能值，dnd5e / 泛用是 DC。
   * 为空表示本次不判定。两个语义共用一个字段，避免同一含义存两份。
   */
  target?: number | null;
  /** 规则集 id */
  rule_set?: string | null;
  /** 判定等级，无判定时为空 */
  outcome?: OutcomeLevel | null;
}

export interface ChatPayload {
  author_card_id?: string | null;
  author_name?: string;
  content: string;
  roll?: RollInfo;
  /** chat.reveal 专有：被揭示事件的原始种类 */
  revealed_kind?: string;
  /** chat.reveal 专有：被揭示事件的序号 */
  revealed_seq?: number;
  /** chat.reveal 专有：被揭示事件的原始时间戳 */
  revealed_at?: number;
}

export function isChatKind(kind: string): kind is ChatEventKind {
  return kind.startsWith("chat.");
}

/** 事件在给定视图下是否可见。玩家视图看不到秘密事件。 */
export function isEventVisible(
  event: GameEvent,
  view: SessionViewMode,
): boolean {
  if (view === "gm") return true;
  return (event.visibility ?? "public") !== "secret";
}

// ============ Manifest / Theme ============

export interface Manifest {
  kind: string;
  schema_version: string;
  name: string;
  version: string;
  author?: string | null;
  description?: string | null;
  theme_id?: string | null;
  default_card_back?: string | null;
  created_at: number;
  updated_at: number;
  default_card_frame_style?: string | null;
}

export interface Theme {
  id: string;
  name: string;
  description?: string | null;
  variables: Record<string, string>;
  created_at: number;
  updated_at: number;
}

// ============ 项目快照 ============

export interface ProjectSnapshot {
  cards: Card[];
  card_types: CardType[];
  relation_kinds: RelationKind[];
  relations: Relation[];
  scenarios: Scenario[];
  boards: Board[];
  sessions: Session[];
  card_groups: CardGroup[];
}

// ============ 资源包合并 ============

export type TypeMapAction =
  | { action: "existing"; target_id: string }
  | { action: "new" }
  | { action: "skip" };

export interface InspectType extends CardType {
  card_count: number;
}

export interface InspectNamed {
  id: string;
  name: string;
}

export interface PackInspection {
  manifest: Manifest;
  card_types: InspectType[];
  relation_kinds: RelationKind[];
  scenarios: InspectNamed[];
  boards: InspectNamed[];
  sessions: InspectNamed[];
  card_groups: InspectNamed[];
  total_cards: number;
  total_relations: number;
}

export interface MergeOptions {
  types_only?: boolean;
  card_type_map?: Record<string, TypeMapAction>;
  relation_kind_map?: Record<string, TypeMapAction>;
  include_scenarios?: string[];
  include_boards?: string[];
  include_sessions?: string[];
  include_card_groups?: string[];
}

export interface MergeResult {
  imported_types: number;
  imported_cards: number;
  imported_relations: number;
  imported_scenarios: number;
  imported_boards: number;
  imported_sessions: number;
  imported_card_groups: number;
  imported_assets: number;
  skipped_types: string[];
}

export interface PresetInfo {
  id: string;
  label: string;
  description: string;
}

export interface ProjectStats {
  card_types: number;
  relation_kinds: number;
  cards: number;
  relations: number;
  scenarios: number;
  boards: number;
  sessions: number;
  events: number;
  images: number;
}

export interface AudioMeta {
  path: string;
  size: number;
  ref_count: number;
}

export interface ScriptHit {
  filename: string;
  /** 0-based 行号 */
  line: number;
  snippet: string;
}

// ============ 引用扫描 ============

/**
 * 引用来源的种类。
 *
 * 项目里「一切实体皆卡牌」只建了正向引用（token 指向 card），
 * 反向一直没人维护。这一节用于回答「谁在引用它」。
 */
export type RefKind =
  | "board_token"
  | "board_pile"
  | "session_token"
  | "session_pile"
  | "session_init"
  | "session_board"
  | "relation"
  | "card_group"
  | "card_type";

/** 一条引用记录 */
export interface RefHit {
  kind: RefKind;
  /** 宿主实体 id（棋盘 / 会话 / 卡组） */
  owner_id: string;
  /** 宿主实体名 */
  owner_name: string;
  detail: string | null;
  /** 完整中文描述，UI 可直接展示 */
  label: string;
  /** 能否自动清理。false 表示需要用户手动处理 */
  auto: boolean;
}

/** 被删除的目标种类 */
export type RefTargetKind = "card" | "board" | "card_group";

/**
 * 清理力度。
 * remove = 把引用者整个摘掉；detach = 保留引用者但断开指针。
 */
export type RefClearMode = "remove" | "detach";
