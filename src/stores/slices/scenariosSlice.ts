import type { StateCreator } from "zustand";
import type { Scenario } from "../../core/ipc";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  "scenarios" | "upsertScenario" | "removeScenario"
>;

export const createScenariosSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  scenarios: [],

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
});
