import type { StateCreator } from "zustand";
import type { ProjectState } from "./types";

type Slice = Pick<
  ProjectState,
  "projectPath" | "setProject" | "refreshProject" | "closeProject"
>;

export const createProjectSlice: StateCreator<ProjectState, [], [], Slice> = (
  set,
) => ({
  projectPath: null,

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
});
