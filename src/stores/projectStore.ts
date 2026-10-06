import { create } from "zustand";
import type {
  Board,
  Card,
  CardType,
  Relation,
  RelationKind,
  Scenario,
  Session,
} from "../core/ipc";

export type ModuleKey = "world" | "story" | "board" | "session" | "types";
export type WorldSubView = "cards" | "graph";
export type CardWallView = "card" | "list";

export interface UndoEntry {
  id: string;
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface ProjectState {
  projectPath: string | null;
  selectedEdgeId: string | null;
  cards: Card[];
  cardTypes: CardType[];
  relationKinds: RelationKind[];
  relations: Relation[];
  scenarios: Scenario[];
  boards: Board[];
  sessions: Session[];
  selectedCardId: string | null;
  selectedTokenId: string | null;
  currentBoardId: string | null;
  activeModule: ModuleKey;
  worldSubView: WorldSubView;
  cardWallView: CardWallView;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingSaves: number;
  inspectorWidth: number;
  inspectorCollapsed: boolean;
  selectedCardTypeId: string | null;
  currentSessionId: string | null;
  selectedCardIds: string[];
  selectedTokenIds: string[];

  setProject: (
    path: string,
    cards: Card[],
    types: CardType[],
    relationKinds: RelationKind[],
    relations: Relation[],
    scenarios: Scenario[],
    boards: Board[],
    sessions: Session[],
  ) => void;

  refreshProject: (data: {
    cards: Card[];
    cardTypes: CardType[];
    relationKinds: RelationKind[];
    relations: Relation[];
    scenarios: Scenario[];
    boards: Board[];
    sessions: Session[];
  }) => void;

  closeProject: () => void;
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (id: string) => void;
  setCardTypes: (types: CardType[]) => void;
  upsertCardType: (type: CardType) => void;
  upsertRelationKind: (kind: RelationKind) => void;
  upsertRelation: (r: Relation) => void;
  removeRelation: (id: string) => void;
  upsertScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;
  upsertBoard: (b: Board) => void;
  removeBoard: (id: string) => void;
  upsertSession: (s: Session) => void;
  removeSession: (id: string) => void;
  selectCard: (id: string | null) => void;
  selectToken: (id: string | null) => void;
  setCurrentBoard: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
  setWorldSubView: (v: WorldSubView) => void;
  setCardWallView: (v: CardWallView) => void;
  pushUndo: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  incPendingSaves: () => void;
  decPendingSaves: () => void;
  setInspectorWidth: (w: number) => void;
  toggleInspector: () => void;
  removeCardType: (id: string) => void;
  removeRelationKind: (id: string) => void;
  selectEdge: (id: string | null) => void;
  selectCardType: (id: string | null) => void;
  setCurrentSession: (id: string | null) => void;
  toggleCardSelection: (id: string) => void;
  selectCardsRange: (
    fromId: string,
    toId: string,
    orderedIds: string[],
  ) => void;
  clearCardSelection: () => void;
  toggleTokenSelection: (id: string) => void;
  clearTokenSelection: () => void;
  setCardSelection: (ids: string[]) => void;
  setTokenSelection: (ids: string[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  cards: [],
  cardTypes: [],
  relationKinds: [],
  relations: [],
  scenarios: [],
  boards: [],
  sessions: [],
  selectedCardId: null,
  selectedTokenId: null,
  currentBoardId: null,
  activeModule: "world",
  worldSubView: "cards",
  cardWallView: "card",
  undoStack: [],
  redoStack: [],
  pendingSaves: 0,
  inspectorWidth: 320,
  inspectorCollapsed: false,
  selectedEdgeId: null,
  selectedCardTypeId: null,
  currentSessionId: null,
  selectedCardIds: [],
  selectedTokenIds: [],

  setProject: (
    projectPath,
    cards,
    cardTypes,
    relationKinds,
    relations,
    scenarios,
    boards,
    sessions,
  ) =>
    set({
      projectPath,
      cards: cards ?? [],
      cardTypes: cardTypes ?? [],
      relationKinds: relationKinds ?? [],
      relations: relations ?? [],
      scenarios: scenarios ?? [],
      boards: boards ?? [],
      sessions: sessions ?? [],
      selectedCardId: null,
      selectedTokenId: null,
      currentBoardId: null,
      undoStack: [],
      redoStack: [],
      pendingSaves: 0,
    }),

  refreshProject: (data) =>
    set((s) => {
      // 保留选中，但过滤掉已不存在的对象
      const selectedCardId =
        s.selectedCardId && data.cards.some((c) => c.id === s.selectedCardId)
          ? s.selectedCardId
          : null;
      const currentBoardId =
        s.currentBoardId && data.boards.some((b) => b.id === s.currentBoardId)
          ? s.currentBoardId
          : null;
      const selectedTokenId =
        s.selectedTokenId &&
        data.boards.some((b) =>
          (b.tokens ?? []).some((t) => t.id === s.selectedTokenId),
        )
          ? s.selectedTokenId
          : null;

      return {
        cards: data.cards ?? [],
        cardTypes: data.cardTypes ?? [],
        relationKinds: data.relationKinds ?? [],
        relations: data.relations ?? [],
        scenarios: data.scenarios ?? [],
        boards: data.boards ?? [],
        sessions: data.sessions ?? [],
        selectedCardId,
        selectedTokenId,
        currentBoardId,
        // 不清 undo / redo，不清 activeModule
      };
    }),

  closeProject: () =>
    set({
      projectPath: null,
      cards: [],
      cardTypes: [],
      relationKinds: [],
      relations: [],
      scenarios: [],
      boards: [],
      sessions: [],
      selectedCardId: null,
      selectedTokenId: null,
      currentBoardId: null,
    }),

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

  setCurrentBoard: (currentBoardId) =>
    set({
      currentBoardId,
      selectedTokenId: null,
      selectedEdgeId: null,
      selectedTokenIds: [],
    }),
  setActiveModule: (activeModule) => set({ activeModule }),
  setWorldSubView: (worldSubView) => set({ worldSubView }),
  setCardWallView: (cardWallView) => set({ cardWallView }),

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
      alert("撤销失败: " + e);
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
      alert("重做失败: " + e);
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

  setInspectorWidth: (w) =>
    set({ inspectorWidth: Math.max(200, Math.min(700, w)) }),
  toggleInspector: () =>
    set((s) => ({ inspectorCollapsed: !s.inspectorCollapsed })),

  removeCardType: (id) =>
    set((s) => ({
      cardTypes: (s.cardTypes ?? []).filter((t) => t.id !== id),
      selectedCardTypeId:
        s.selectedCardTypeId === id ? null : s.selectedCardTypeId,
    })),

  removeRelationKind: (id) =>
    set((s) => ({
      relationKinds: (s.relationKinds ?? []).filter((k) => k.id !== id),
    })),

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

  setCurrentSession: (currentSessionId) =>
    set({ currentSessionId, selectedTokenId: null }),

  setCardSelection: (ids) =>
    set({
      selectedCardIds: ids,
      selectedCardId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedTokenId: null,
      selectedEdgeId: null,
      selectedTokenIds: [],
    }),

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

  setTokenSelection: (ids) =>
    set({
      selectedTokenIds: ids,
      selectedTokenId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedCardId: null,
      selectedEdgeId: null,
      selectedCardIds: [],
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
}));
