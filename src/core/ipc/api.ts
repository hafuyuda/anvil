import { invoke } from "@tauri-apps/api/core";
import type {
  Board,
  Card,
  CardType,
  GameEvent,
  Manifest,
  ProjectSnapshot,
  Relation,
  RelationKind,
  Scenario,
  Session,
  Theme,
  MergeOptions,
  MergeResult,
  PackInspection,
} from "./types";

export const ipc = {
  // ── 项目 ──
  openProject: (path: string) => invoke<void>("open_project", { path }),
  closeProject: () => invoke<void>("close_project"),
  createProject: (path: string, name: string) =>
    invoke<void>("create_project", { path, name }),
  isDirectoryEmpty: (path: string) =>
    invoke<boolean>("is_directory_empty", { path }),
  reloadProject: () => invoke<ProjectSnapshot>("reload_project"),
  rebuildIndex: () => invoke<void>("rebuild_index"),
  seedExampleWorld: () => invoke<void>("seed_example_world"),

  // ── Manifest ──
  loadManifest: () => invoke<Manifest>("load_manifest"),
  saveManifest: (manifest: Manifest) =>
    invoke<void>("save_manifest", { manifest }),

  // ── 资源包 ──
  exportPack: (outputPath: string) =>
    invoke<void>("export_pack", { outputPath }),
  importPack: (src: string, dest: string) =>
    invoke<void>("import_pack", { src, dest }),

  // ── 资源包合并 ──
  inspectPack: (src: string) =>
    invoke<PackInspection>("inspect_pack_cmd", { src }),
  mergePack: (src: string, options: MergeOptions) =>
    invoke<MergeResult>("merge_pack", { src, options }),

  // ── 卡牌 ──
  saveCard: (card: Card) => invoke<void>("save_card", { card }),
  listCards: () => invoke<Card[]>("list_cards"),
  deleteCard: (id: string) => invoke<void>("delete_card", { id }),
  searchCards: (query: string, limit?: number) =>
    invoke<string[]>("search_cards", { query, limit }),

  // ── 卡牌类型 ──
  listCardTypes: () => invoke<CardType[]>("list_card_types"),
  upsertCardType: (cardType: CardType) =>
    invoke<void>("upsert_card_type", { cardType }),
  deleteCardType: (id: string) => invoke<void>("delete_card_type", { id }),

  // ── 关系类型 ──
  listRelationKinds: () => invoke<RelationKind[]>("list_relation_kinds"),
  upsertRelationKind: (relationKind: RelationKind) =>
    invoke<void>("upsert_relation_kind", { relationKind }),
  deleteRelationKind: (id: string) =>
    invoke<void>("delete_relation_kind", { id }),

  // ── 关系 ──
  listAllRelations: () => invoke<Relation[]>("list_all_relations"),
  upsertRelation: (relation: Relation) =>
    invoke<void>("upsert_relation", { relation }),
  deleteRelation: (fromId: string, relationId: string) =>
    invoke<void>("delete_relation", { fromId, relationId }),

  // ── 剧情 ──
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

  // ── 棋盘 ──
  listBoards: () => invoke<Board[]>("list_boards"),
  upsertBoard: (board: Board) => invoke<void>("upsert_board", { board }),
  deleteBoard: (id: string) => invoke<void>("delete_board", { id }),

  // ── 会话 ──
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

  // ── 主题 ──
  listThemes: () => invoke<Theme[]>("list_themes"),
  upsertTheme: (theme: Theme) => invoke<void>("upsert_theme", { theme }),
  deleteTheme: (id: string) => invoke<void>("delete_theme", { id }),

  // ── 图片资源 ──
  importImage: (src: string) => invoke<string>("import_image", { src }),
  deleteImage: (relative: string) => invoke<void>("delete_image", { relative }),
  listImages: () => invoke<string[]>("list_images"),
  readImageDataUrl: (relative: string) =>
    invoke<string>("read_image_data_url", { relative }),
};
