import type { StateCreator } from "zustand";
import type { Relation, RelationKind } from "../../core/ipc";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  | "relationKinds"
  | "relations"
  | "upsertRelationKind"
  | "removeRelationKind"
  | "upsertRelation"
  | "removeRelation"
>;

export const createRelationsSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  relationKinds: [],
  relations: [],

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

  removeRelationKind: (id) =>
    set((s) => ({
      relationKinds: (s.relationKinds ?? []).filter((k) => k.id !== id),
    })),

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
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    })),
});
