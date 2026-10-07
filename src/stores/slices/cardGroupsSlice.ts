import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  "cardGroups" | "upsertCardGroup" | "removeCardGroup"
>;

export const createCardGroupsSlice: StateCreator<
  ProjectState,
  [],
  [],
  Slice
> = (set) => ({
  cardGroups: [],

  upsertCardGroup: (g) =>
    set((s) => {
      const list = s.cardGroups ?? [];
      const exists = list.some((x) => x.id === g.id);
      return {
        cardGroups: exists
          ? list.map((x) => (x.id === g.id ? g : x))
          : [...list, g],
      };
    }),

  removeCardGroup: (id) =>
    set((s) => ({
      cardGroups: (s.cardGroups ?? []).filter((g) => g.id !== id),
    })),
});
