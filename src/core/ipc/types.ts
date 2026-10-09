// ============ Card ============

export type CardId = string;
export type TypeId = string;

export interface Card {
  id: CardId;
  type_id: TypeId;
  name: string;
  values: Record<string, unknown>;
  image_crop_override?: CropRect | null;
  image_extend_override?: ImageExtend | null;
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

export interface ImageExtend {
  /** 0–1，相对图像区高度的比例 */
  top: number;
  bottom: number;
  /** 0–1，相对图像区宽度的比例 */
  left: number;
  right: number;
}

export interface CardFrameConfig {
  style?: string | null;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  level?: string | null;
  level_label?: string | null;
  type_line?: string | null;
  body: string[];
  atk?: string | null;
  atk_label?: string | null;
  def?: string | null;
  def_label?: string | null;
  hp?: string | null;
  hp_label?: string | null;
  foil_field?: string | null;
  foil_values: string[];
  image_crop?: CropRect | null;
  image_extend?: ImageExtend | null;
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
  entry_node?: string | null;
  node_ids: string[];
  edge_kinds: string[];
  node_positions: Record<string, [number, number]>;
  variables: VariableDef[];
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

export interface Session {
  id: string;
  name: string;
  board_id?: string | null;
  state: Record<string, unknown>;
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
}

export type ChatEventKind =
  | "chat.say"
  | "chat.action"
  | "chat.roll"
  | "chat.narration"
  | "chat.ooc"
  | "chat.whisper";

export type SystemEventKind =
  "session.start" | "session.end" | "token.move" | "state.set" | "note";

export type AnyEventKind = ChatEventKind | SystemEventKind;

export interface RollInfo {
  expr: string;
  result: number;
  detail: number[];
}

export interface ChatPayload {
  author_card_id?: string | null;
  author_name?: string;
  content: string;
  roll?: RollInfo;
}

export function isChatKind(kind: string): kind is ChatEventKind {
  return kind.startsWith("chat.");
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
