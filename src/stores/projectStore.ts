import { create } from "zustand";
import type {
  Card,
  CardType,
  Relation,
  RelationKind,
  Scenario,
} from "../core/ipc";

export type ModuleKey = "world" | "story" | "types";
export type WorldSubView = "cards" | "graph";

interface ProjectState {
  projectPath: string | null;
  cards: Card[];
  cardTypes: CardType[];
  relationKinds: RelationKind[];
  relations: Relation[];
  selectedCardId: string | null;
  activeModule: ModuleKey;
  worldSubView: WorldSubView;
  scenarios: Scenario[];

  setProject: (
    path: string,
    cards: Card[],
    types: CardType[],
    relationKinds: RelationKind[],
    relations: Relation[],
    scenarios: Scenario[],
  ) => void;
  closeProject: () => void;
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (id: string) => void;
  setCardTypes: (types: CardType[]) => void;
  upsertCardType: (type: CardType) => void;
  upsertRelationKind: (kind: RelationKind) => void;
  upsertRelation: (r: Relation) => void;
  removeRelation: (id: string) => void;
  selectCard: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
  setWorldSubView: (v: WorldSubView) => void;
  upsertScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  cards: [],
  cardTypes: [],
  relationKinds: [],
  relations: [],
  selectedCardId: null,
  activeModule: "world",
  worldSubView: "cards",
  scenarios: [],

  setProject: (
    projectPath,
    cards,
    cardTypes,
    relationKinds,
    relations,
    scenarios,
  ) =>
    set({
      projectPath,
      cards,
      cardTypes,
      relationKinds,
      relations,
      scenarios,
      selectedCardId: null,
    }),

  closeProject: () =>
    set({
      projectPath: null,
      cards: [],
      cardTypes: [],
      relationKinds: [],
      relations: [],
      scenarios: [],
      selectedCardId: null,
    }),

  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),

  updateCard: (card) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === card.id ? card : c)),
    })),

  removeCard: (id) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.id !== id),
      relations: s.relations.filter((r) => r.from !== id && r.to !== id),
      selectedCardId: s.selectedCardId === id ? null : s.selectedCardId,
    })),

  setCardTypes: (cardTypes) => set({ cardTypes }),

  upsertCardType: (type) =>
    set((s) => {
      const exists = s.cardTypes.some((t) => t.id === type.id);
      return {
        cardTypes: exists
          ? s.cardTypes.map((t) => (t.id === type.id ? type : t))
          : [...s.cardTypes, type],
      };
    }),

  upsertRelationKind: (kind) =>
    set((s) => {
      const exists = s.relationKinds.some((k) => k.id === kind.id);
      return {
        relationKinds: exists
          ? s.relationKinds.map((k) => (k.id === kind.id ? kind : k))
          : [...s.relationKinds, kind],
      };
    }),

  upsertRelation: (r) =>
    set((s) => {
      const exists = s.relations.some((x) => x.id === r.id);
      return {
        relations: exists
          ? s.relations.map((x) => (x.id === r.id ? r : x))
          : [...s.relations, r],
      };
    }),

  upsertScenario: (s) =>
    set((state) => {
      const exists = state.scenarios.some((x) => x.id === s.id);
      return {
        scenarios: exists
          ? state.scenarios.map((x) => (x.id === s.id ? s : x))
          : [...state.scenarios, s],
      };
    }),

  removeScenario: (id) =>
    set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) })),
  removeRelation: (id) =>
    set((s) => ({ relations: s.relations.filter((r) => r.id !== id) })),

  selectCard: (selectedCardId) => set({ selectedCardId }),
  setActiveModule: (activeModule) => set({ activeModule }),
  setWorldSubView: (worldSubView) => set({ worldSubView }),
}));
