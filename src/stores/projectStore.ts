import { create } from "zustand";
import type { Card, CardType, RelationKind } from "../core/ipc";

export type ModuleKey = "world" | "types";

interface ProjectState {
  projectPath: string | null;
  cards: Card[];
  cardTypes: CardType[];
  relationKinds: RelationKind[];
  selectedCardId: string | null;
  activeModule: ModuleKey;

  setProject: (
    path: string,
    cards: Card[],
    types: CardType[],
    relationKinds: RelationKind[]
  ) => void;
  closeProject: () => void;
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (id: string) => void;
  setCardTypes: (types: CardType[]) => void;
  upsertCardType: (type: CardType) => void;
  upsertRelationKind: (kind: RelationKind) => void;
  selectCard: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  cards: [],
  cardTypes: [],
  relationKinds: [],
  selectedCardId: null,
  activeModule: "world",

  setProject: (projectPath, cards, cardTypes, relationKinds) =>
    set({ projectPath, cards, cardTypes, relationKinds, selectedCardId: null }),

  closeProject: () =>
    set({
      projectPath: null,
      cards: [],
      cardTypes: [],
      relationKinds: [],
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

  selectCard: (selectedCardId) => set({ selectedCardId }),
  setActiveModule: (activeModule) => set({ activeModule }),
}));