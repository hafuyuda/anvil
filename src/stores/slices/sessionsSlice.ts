import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";

type Slice = Pick<ProjectState, "sessions" | "upsertSession" | "removeSession">;

export const createSessionsSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  sessions: [],

  upsertSession: (sc) =>
    set((s) => {
      const list = s.sessions ?? [];
      const exists = list.some((x) => x.id === sc.id);
      return {
        sessions: exists
          ? list.map((x) => (x.id === sc.id ? sc : x))
          : [...list, sc],
      };
    }),

  removeSession: (id) =>
    set((s) => ({
      sessions: (s.sessions ?? []).filter((x) => x.id !== id),
    })),
});
