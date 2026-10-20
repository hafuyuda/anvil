import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";
import {
  clampInspectorWidth,
  getInspectorPrefs,
  saveInspectorPrefs,
} from "../../lib/inspectorPrefs";

type Slice = Pick<
  ProjectState,
  | "selectedCardId"
  | "selectedTokenId"
  | "selectedEdgeId"
  | "selectedCardTypeId"
  | "currentBoardId"
  | "currentSessionId"
  | "activeModule"
  | "cardWallView"
  | "cardGroupView"
  | "inspectorWidth"
  | "inspectorCollapsed"
  | "selectedCardIds"
  | "selectedTokenIds"
  | "selectCard"
  | "selectToken"
  | "selectEdge"
  | "selectCardType"
  | "setCurrentBoard"
  | "setCurrentSession"
  | "setActiveModule"
  | "setCardGroupView"
  | "setCardWallView"
  | "setInspectorWidth"
  | "setInspectorCollapsed"
  | "toggleInspector"
  | "toggleCardSelection"
  | "selectCardsRange"
  | "clearCardSelection"
  | "setCardSelection"
  | "toggleTokenSelection"
  | "clearTokenSelection"
  | "setTokenSelection"
  | "currentScenarioId"
  | "currentSceneId"
  | "setCurrentScenario"
  | "setCurrentScene"
>;

export const createUISlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
  get,
) => {
  // 宽度与折叠状态跨会话保留
  const prefs = getInspectorPrefs();

  return {
  selectedCardId: null,
  selectedTokenId: null,
  selectedEdgeId: null,
  selectedCardTypeId: null,
  currentBoardId: null,
  currentSessionId: null,
  activeModule: "world",
  cardWallView: "card",
  cardGroupView: "grid",
  inspectorWidth: prefs.width,
  inspectorCollapsed: prefs.collapsed,
  selectedCardIds: [],
  selectedTokenIds: [],
  currentScenarioId: null,
  currentSceneId: null,

  selectCard: (selectedCardId) =>
    set({
      selectedCardId,
      selectedTokenId: null,
      selectedEdgeId: null,
      selectedCardIds: selectedCardId ? [selectedCardId] : [],
      selectedTokenIds: [],
    }),

  selectToken: (selectedTokenId) =>
    set({
      selectedTokenId,
      selectedCardId: null,
      selectedEdgeId: null,
      selectedTokenIds: selectedTokenId ? [selectedTokenId] : [],
      selectedCardIds: [],
    }),

  selectEdge: (selectedEdgeId) =>
    set({
      selectedEdgeId,
      selectedCardId: null,
      selectedTokenId: null,
      selectedCardIds: [],
      selectedTokenIds: [],
    }),

  selectCardType: (selectedCardTypeId) => set({ selectedCardTypeId }),

  setCurrentBoard: (currentBoardId) =>
    set({
      currentBoardId,
      selectedTokenId: null,
      selectedEdgeId: null,
      selectedTokenIds: [],
    }),

  setCurrentSession: (currentSessionId) =>
    set({ currentSessionId, selectedTokenId: null }),

  setActiveModule: (activeModule) => set({ activeModule }),
  setCardWallView: (cardWallView) => set({ cardWallView }),
  setCardGroupView: (cardGroupView) => set({ cardGroupView }),

  setInspectorWidth: (w) => {
    const clamped = clampInspectorWidth(w);
    set({ inspectorWidth: clamped });
    saveInspectorPrefs({ width: clamped });
  },

  setInspectorCollapsed: (v) => {
    set({ inspectorCollapsed: v });
    saveInspectorPrefs({ collapsed: v });
  },

  toggleInspector: () => {
    const next = !get().inspectorCollapsed;
    set({ inspectorCollapsed: next });
    saveInspectorPrefs({ collapsed: next });
  },

  toggleCardSelection: (id) =>
    set((s) => {
      const arr = [...(s.selectedCardIds ?? [])];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      return {
        selectedCardIds: arr,
        selectedCardId: arr.length > 0 ? arr[arr.length - 1] : null,
        selectedTokenId: null,
        selectedEdgeId: null,
      };
    }),

  selectCardsRange: (fromId, toId, orderedIds) =>
    set(() => {
      const i1 = orderedIds.indexOf(fromId);
      const i2 = orderedIds.indexOf(toId);
      if (i1 < 0 || i2 < 0) return {};
      const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
      const arr = orderedIds.slice(lo, hi + 1);
      return {
        selectedCardIds: arr,
        selectedCardId: toId,
        selectedTokenId: null,
        selectedEdgeId: null,
      };
    }),

  clearCardSelection: () => set({ selectedCardIds: [], selectedCardId: null }),

  setCardSelection: (ids) =>
    set({
      selectedCardIds: ids,
      selectedCardId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedTokenId: null,
      selectedEdgeId: null,
      selectedTokenIds: [],
    }),

  toggleTokenSelection: (id) =>
    set((s) => {
      const arr = [...(s.selectedTokenIds ?? [])];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      return {
        selectedTokenIds: arr,
        selectedTokenId: arr.length > 0 ? arr[arr.length - 1] : null,
        selectedCardId: null,
        selectedEdgeId: null,
      };
    }),

  clearTokenSelection: () =>
    set({ selectedTokenIds: [], selectedTokenId: null }),

  setTokenSelection: (ids) =>
    set({
      selectedTokenIds: ids,
      selectedTokenId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedCardId: null,
      selectedEdgeId: null,
      selectedCardIds: [],
    }),

  setCurrentScenario: (currentScenarioId) =>
    set({ currentScenarioId, currentSceneId: null }),
  setCurrentScene: (currentSceneId) => set({ currentSceneId }),
  };
};
