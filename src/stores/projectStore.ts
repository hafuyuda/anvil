import { create } from "zustand";
import type { Card, CardType } from "../core/ipc";

export type ModuleKey = "world" | "types";

interface ProjectState {
  projectPath: string | null;
  cards: Card[];
  cardTypes: CardType[];
  selectedCardId: string | null;
  activeModule: ModuleKey;

  setProject: (path: string, cards: Card[], types: CardType[]) => void;
  closeProject: () => void;
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  setCardTypes: (types: CardType[]) => void;
  upsertCardType: (type: CardType) => void;
  selectCard: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectPath: null,
  cards: [],
  cardTypes: [],
  selectedCardId: null,
  activeModule: "world",

  setProject: (projectPath, cards, cardTypes) =>
    set({ projectPath, cards, cardTypes, selectedCardId: null }),
  closeProject: () =>
    set({
      projectPath: null,
      cards: [],
      cardTypes: [],
      selectedCardId: null,
    }),
  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),
  updateCard: (card) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === card.id ? card : c)),
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
  selectCard: (selectedCardId) => set({ selectedCardId }),
  setActiveModule: (activeModule) => set({ activeModule }),
}));