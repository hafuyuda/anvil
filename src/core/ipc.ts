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

export interface CardType {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  fields: FieldDef[];
  allowed_relation_kinds: string[];
  views: string[];
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
deleteScenario: (id: string) =>
  invoke<void>("delete_scenario", { id }),
};
