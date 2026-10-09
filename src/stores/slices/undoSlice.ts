import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";
import { toast } from "../../lib/toast";

type Slice = Pick<
  ProjectState,
  | "undoStack"
  | "redoStack"
  | "pendingSaves"
  | "pushUndo"
  | "undo"
  | "redo"
  | "clearHistory"
  | "incPendingSaves"
  | "decPendingSaves"
>;

export const createUndoSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
  get,
) => ({
  undoStack: [],
  redoStack: [],
  pendingSaves: 0,

  pushUndo: (entry) =>
    set((s) => ({
      undoStack: [...(s.undoStack ?? []), entry].slice(-100),
      redoStack: [],
    })),

  undo: async () => {
    const s = get();
    const stack = s.undoStack ?? [];
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    try {
      await entry.undo();
      set((st) => ({ redoStack: [...(st.redoStack ?? []), entry] }));
    } catch (e) {
      toast.error("撤销失败: " + e);
      set((st) => ({ undoStack: [...(st.undoStack ?? []), entry] }));
    }
  },

  redo: async () => {
    const s = get();
    const stack = s.redoStack ?? [];
    if (stack.length === 0) return;
    const entry = stack[stack.length - 1];
    set({ redoStack: stack.slice(0, -1) });
    try {
      await entry.redo();
      set((st) => ({ undoStack: [...(st.undoStack ?? []), entry] }));
    } catch (e) {
      toast.error("重做失败: " + e);
      set((st) => ({ redoStack: [...(st.redoStack ?? []), entry] }));
    }
  },

  clearHistory: () => set({ undoStack: [], redoStack: [] }),

  incPendingSaves: () =>
    set((s) => ({ pendingSaves: (s.pendingSaves ?? 0) + 1 })),

  decPendingSaves: () =>
    set((s) => ({
      pendingSaves: Math.max(0, (s.pendingSaves ?? 0) - 1),
    })),
});
