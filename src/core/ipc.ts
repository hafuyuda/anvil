import { invoke } from "@tauri-apps/api/core";

export interface Card {
  id: string;
  type_id: string;
  name: string;
  values: Record<string, unknown>;
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

export interface CardFrameConfig {
  style?: string | null;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  level?: string | null;
  type_line?: string | null;
  body: string[];
  atk?: string | null;
  def?: string | null;
  hp?: string | null;
}

export interface CardType {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  fields: FieldDef[];
  allowed_relation_kinds: string[];
  views: string[];
  card_frame?: CardFrameConfig | null;
  created_at: number;
  updated_at: number;
}

export interface RelationKind {
  id: string;
  name: string;
  inverse_name?: string | null;
  directed: boolean;
  color?: string | null;
  from_types: string[];
  to_types: string[];
  fields: FieldDef[];
  created_at: number;
  updated_at: number;
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  kind: string;
  label?: string | null;
  meta: Record<string, unknown>;
  created_at: number;
}

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
export interface GridConfig {
  size: number;
  offset_x: number;
  offset_y: number;
  visible: boolean;
  snap: boolean;
}

export interface Token {
  id: string;
  card_id?: string | null;
  name_override?: string | null;
  value_overrides: Record<string, unknown>;
  x: number;
  y: number;
  w?: number | null;
  h?: number | null;
  rotation: number;
  layer: number;
  visible: boolean;
}

export interface Board {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: GridConfig;
  background?: string | null;
  tokens: Token[];
  created_at: number;
  updated_at: number;
}

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

export interface Manifest {
  kind: string;
  schema_version: string;
  name: string;
  version: string;
  author?: string | null;
  description?: string | null;
  created_at: number;
  updated_at: number;
  theme_id?: string | null;
}

// ============ 跑团消息 ============

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

export interface Theme {
  id: string;
  name: string;
  description?: string | null;
  variables: Record<string, string>;
  created_at: number;
  updated_at: number;
}

export function isChatKind(kind: string): kind is ChatEventKind {
  return kind.startsWith("chat.");
}
export const ipc = {
  openProject: (path: string) => invoke<void>("open_project", { path }),
  saveCard: (card: Card) => invoke<void>("save_card", { card }),
  listCards: () => invoke<Card[]>("list_cards"),
  listCardTypes: () => invoke<CardType[]>("list_card_types"),
  upsertCardType: (cardType: CardType) =>
    invoke<void>("upsert_card_type", { cardType }),
  seedExampleWorld: () => invoke<void>("seed_example_world"),
  searchCards: (query: string, limit?: number) =>
    invoke<string[]>("search_cards", { query, limit }),
  rebuildIndex: () => invoke<void>("rebuild_index"),
  deleteCard: (id: string) => invoke<void>("delete_card", { id }),
  listRelationKinds: () => invoke<RelationKind[]>("list_relation_kinds"),
  upsertRelationKind: (relationKind: RelationKind) =>
    invoke<void>("upsert_relation_kind", { relationKind }),
  // reloadProject 返回值更新：
  reloadProject: () =>
    invoke<{
      cards: Card[];
      card_types: CardType[];
      relation_kinds: RelationKind[];
      relations: Relation[];
      scenarios: Scenario[];
      boards: Board[];
      sessions: Session[];
    }>("reload_project"),
  listAllRelations: () => invoke<Relation[]>("list_all_relations"),
  upsertRelation: (relation: Relation) =>
    invoke<void>("upsert_relation", { relation }),
  deleteRelation: (fromId: string, relationId: string) =>
    invoke<void>("delete_relation", { fromId, relationId }),
  closeProject: () => invoke<void>("close_project"),
  listScenarios: () => invoke<Scenario[]>("list_scenarios"),
  upsertScenario: (scenario: Scenario) =>
    invoke<void>("upsert_scenario", { scenario }),
  deleteScenario: (id: string) => invoke<void>("delete_scenario", { id }),

  validateCondition: (scenario: Scenario, expr: string) =>
    invoke<void>("validate_condition", { scenario, expr }),
  evalCondition: (
    scenario: Scenario,
    expr: string,
    overrides: Record<string, unknown>,
  ) => invoke<boolean>("eval_condition", { scenario, expr, overrides }),
  listBoards: () => invoke<Board[]>("list_boards"),
  upsertBoard: (board: Board) => invoke<void>("upsert_board", { board }),
  deleteBoard: (id: string) => invoke<void>("delete_board", { id }),

  listSessions: () => invoke<Session[]>("list_sessions"),
  upsertSession: (session: Session) =>
    invoke<void>("upsert_session", { session }),
  deleteSession: (id: string) => invoke<void>("delete_session", { id }),
  listEvents: (sessionId: string) =>
    invoke<GameEvent[]>("list_events", { sessionId }),
  appendEvent: (
    sessionId: string,
    kind: string,
    payload: unknown,
    note?: string,
  ) => invoke<void>("append_event", { sessionId, kind, payload, note }),
  loadManifest: () => invoke<Manifest>("load_manifest"),
  saveManifest: (manifest: Manifest) =>
    invoke<void>("save_manifest", { manifest }),
  exportPack: (outputPath: string) =>
    invoke<void>("export_pack", { outputPath }),
  importPack: (src: string, dest: string) =>
    invoke<void>("import_pack", { src, dest }),
  createProject: (path: string, name: string) =>
    invoke<void>("create_project", { path, name }),
  isDirectoryEmpty: (path: string) =>
    invoke<boolean>("is_directory_empty", { path }),
  listThemes: () => invoke<Theme[]>("list_themes"),
  upsertTheme: (theme: Theme) => invoke<void>("upsert_theme", { theme }),
  deleteTheme: (id: string) => invoke<void>("delete_theme", { id }),
  importImage: (src: string) => invoke<string>("import_image", { src }),
  deleteImage: (relative: string) => invoke<void>("delete_image", { relative }),
  listImages: () => invoke<string[]>("list_images"),
  readImageDataUrl: (relative: string) =>
    invoke<string>("read_image_data_url", { relative }),
};
