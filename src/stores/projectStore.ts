import { create } from "zustand";
import type {
  Board,
  Card,
  CardType,
  Relation,
  RelationKind,
  Scenario,
} from "../core/ipc";

export type ModuleKey = "world" | "story" | "board" | "types";
export type WorldSubView = "cards" | "graph";

interface ProjectState {
  projectPath: string | null;
  cards: Card[];
  cardTypes: CardType[];
  relationKinds: RelationKind[];
  relations: Relation[];
  scenarios: Scenario[];
  boards: Board[];
  selectedCardId: string | null;
  selectedTokenId: string | null;
  currentBoardId: string | null;
  activeModule: ModuleKey;
  worldSubView: WorldSubView;

  setProject: (
    path: string,
    cards: Card[],
    types: CardType[],
    relationKinds: RelationKind[],
    relations: Relation[],
    scenarios: Scenario[],
    boards: Board[],
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
  upsertScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;
  upsertBoard: (b: Board) => void;
  removeBoard: (id: string) => void;
  selectCard: (id: string | null) => void;
  selectToken: (id: string | null) => void;
  setCurrentBoard: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
  setWorldSubView: (v: WorldSubView) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  cards: [],
  cardTypes: [],
  relationKinds: [],
  relations: [],
  scenarios: [],
  boards: [],
  selectedCardId: null,
  selectedTokenId: null,
  currentBoardId: null,
  activeModule: "world",
  worldSubView: "cards",

  setProject: (
    projectPath,
    cards,
    cardTypes,
    relationKinds,
    relations,
    scenarios,
    boards,
  ) =>
    set({
      projectPath,
      cards: cards ?? [],
      cardTypes: cardTypes ?? [],
      relationKinds: relationKinds ?? [],
      relations: relations ?? [],
      scenarios: scenarios ?? [],
      boards: boards ?? [],
      selectedCardId: null,
      selectedTokenId: null,
      currentBoardId: null,
    }),

  closeProject: () =>
    set({
      projectPath: null,
      cards: [],
      cardTypes: [],
      relationKinds: [],
      relations: [],
      scenarios: [],
      boards: [],
      selectedCardId: null,
      selectedTokenId: null,
      currentBoardId: null,
    }),

  addCard: (card) => set((s) => ({ cards: [...(s.cards ?? []), card] })),

  updateCard: (card) =>
    set((s) => ({
      cards: (s.cards ?? []).map((c) => (c.id === card.id ? card : c)),
    })),

  removeCard: (id) =>
    set((s) => ({
      cards: (s.cards ?? []).filter((c) => c.id !== id),
      relations: (s.relations ?? []).filter(
        (r) => r.from !== id && r.to !== id,
      ),
      selectedCardId: s.selectedCardId === id ? null : s.selectedCardId,
    })),

  setCardTypes: (cardTypes) => set({ cardTypes: cardTypes ?? [] }),

  upsertCardType: (type) =>
    set((s) => {
      const list = s.cardTypes ?? [];
      const exists = list.some((t) => t.id === type.id);
      return {
        cardTypes: exists
          ? list.map((t) => (t.id === type.id ? type : t))
          : [...list, type],
      };
    }),

  upsertRelationKind: (kind) =>
    set((s) => {
      const list = s.relationKinds ?? [];
      const exists = list.some((k) => k.id === kind.id);
      return {
        relationKinds: exists
          ? list.map((k) => (k.id === kind.id ? kind : k))
          : [...list, kind],
      };
    }),

  upsertRelation: (r) =>
    set((s) => {
      const list = s.relations ?? [];
      const exists = list.some((x) => x.id === r.id);
      return {
        relations: exists
          ? list.map((x) => (x.id === r.id ? r : x))
          : [...list, r],
      };
    }),

  removeRelation: (id) =>
    set((s) => ({
      relations: (s.relations ?? []).filter((r) => r.id !== id),
    })),

  upsertScenario: (sc) =>
    set((state) => {
      const list = state.scenarios ?? [];
      const exists = list.some((x) => x.id === sc.id);
      return {
        scenarios: exists
          ? list.map((x) => (x.id === sc.id ? sc : x))
          : [...list, sc],
      };
    }),

  removeScenario: (id) =>
    set((s) => ({
      scenarios: (s.scenarios ?? []).filter((x) => x.id !== id),
    })),

  upsertBoard: (b) =>
    set((s) => {
      const list = s.boards ?? [];
      const exists = list.some((x) => x.id === b.id);
      return {
        boards: exists
          ? list.map((x) => (x.id === b.id ? b : x))
          : [...list, b],
      };
    }),

  removeBoard: (id) =>
    set((s) => ({
      boards: (s.boards ?? []).filter((b) => b.id !== id),
    })),

  selectCard: (selectedCardId) =>
    set({ selectedCardId, selectedTokenId: null }),

  selectToken: (selectedTokenId) =>
    set({ selectedTokenId, selectedCardId: null }),

  setCurrentBoard: (currentBoardId) =>
    set({ currentBoardId, selectedTokenId: null }),

  setActiveModule: (activeModule) => set({ activeModule }),
  setWorldSubView: (worldSubView) => set({ worldSubView }),
}));
