import { create } from "zustand";
import type { ProjectState } from "./slices/types";
import { createProjectSlice } from "./slices/projectSlice";
import { createCardsSlice } from "./slices/cardsSlice";
import { createRelationsSlice } from "./slices/relationsSlice";
import { createScenariosSlice } from "./slices/scenariosSlice";
import { createBoardsSlice } from "./slices/boardsSlice";
import { createSessionsSlice } from "./slices/sessionsSlice";
import { createCardGroupsSlice } from "./slices/cardGroupsSlice";
import { createUndoSlice } from "./slices/undoSlice";
import { createUISlice } from "./slices/uiSlice";

export type {
  ProjectState,
  UndoEntry,
  ModuleKey,
  CardWallView,
} from "./slices/types";

export const useProjectStore = create<ProjectState>()((...a) => ({
  ...createProjectSlice(...a),
  ...createCardsSlice(...a),
  ...createRelationsSlice(...a),
  ...createScenariosSlice(...a),
  ...createBoardsSlice(...a),
  ...createSessionsSlice(...a),
  ...createCardGroupsSlice(...a),
  ...createUndoSlice(...a),
  ...createUISlice(...a),
}));
