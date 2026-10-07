import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  | "cards"
  | "cardTypes"
  | "addCard"
  | "updateCard"
  | "removeCard"
  | "setCardTypes"
  | "upsertCardType"
  | "removeCardType"
>;

export const createCardsSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  cards: [],
  cardTypes: [],

  addCard: (card) => set((s) => ({ cards: [...(s.cards ?? []), card] })),

  updateCard: (card) =>
    set((s) => ({
      cards: (s.cards ?? []).map((c) => (c.id === card.id ? card : c)),
    })),

  removeCard: (id) =>
    set((s) => {
      const removedEdgeIds = new Set(
        (s.relations ?? [])
          .filter((r) => r.from === id || r.to === id)
          .map((r) => r.id),
      );
      return {
        cards: (s.cards ?? []).filter((c) => c.id !== id),
        relations: (s.relations ?? []).filter(
          (r) => r.from !== id && r.to !== id,
        ),
        selectedCardId: s.selectedCardId === id ? null : s.selectedCardId,
        selectedEdgeId:
          s.selectedEdgeId && removedEdgeIds.has(s.selectedEdgeId)
            ? null
            : s.selectedEdgeId,
      };
    }),

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

  removeCardType: (id) =>
    set((s) => ({
      cardTypes: (s.cardTypes ?? []).filter((t) => t.id !== id),
      selectedCardTypeId:
        s.selectedCardTypeId === id ? null : s.selectedCardTypeId,
    })),
});
