import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  | "selectedCardId"
  | "selectedTokenId"
  | "selectedEdgeId"
  | "selectedCardTypeId"
  | "currentBoardId"
  | "currentSessionId"
  | "activeModule"
  | "worldSubView"
  | "cardWallView"
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
  | "setWorldSubView"
  | "setCardWallView"
  | "setInspectorWidth"
  | "toggleInspector"
  | "toggleCardSelection"
  | "selectCardsRange"
  | "clearCardSelection"
  | "setCardSelection"
  | "toggleTokenSelection"
  | "clearTokenSelection"
  | "setTokenSelection"
>;

export const createUISlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  selectedCardId: null,
  selectedTokenId: null,
  selectedEdgeId: null,
  selectedCardTypeId: null,
  currentBoardId: null,
  currentSessionId: null,
  activeModule: "world",
  worldSubView: "cards",
  cardWallView: "card",
  inspectorWidth: 320,
  inspectorCollapsed: false,
  selectedCardIds: [],
  selectedTokenIds: [],

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
  setWorldSubView: (worldSubView) => set({ worldSubView }),
  setCardWallView: (cardWallView) => set({ cardWallView }),

  setInspectorWidth: (w) =>
    set({ inspectorWidth: Math.max(200, Math.min(700, w)) }),

  toggleInspector: () =>
    set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),

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
});
