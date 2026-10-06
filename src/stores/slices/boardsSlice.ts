import type { StateCreator } from "zustand";
import type { Board } from "../../core/ipc";
import type { ProjectState } from "./types";

type Slice = Pick<ProjectState, "boards" | "upsertBoard" | "removeBoard">;

export const createBoardsSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  boards: [],

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
});
