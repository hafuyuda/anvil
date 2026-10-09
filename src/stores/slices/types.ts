import type {
  Board,
  Card,
  CardGroup,
  CardType,
  Manifest,
  Relation,
  RelationKind,
  Scenario,
  Session,
} from "../../core/ipc";

export type ModuleKey =
  "world" | "story" | "board" | "cardGroups" | "session" | "types";

export type CardWallView = "card" | "list";

export interface UndoEntry {
  id: string;
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export interface ProjectState {
  // ── project ──
  projectPath: string | null;
  manifest: Manifest | null;
  setManifest: (m: Manifest | null) => void;
  setProject: (
    path: string,
    cards: Card[],
    types: CardType[],
    relationKinds: RelationKind[],
    relations: Relation[],
    scenarios: Scenario[],
    boards: Board[],
    sessions: Session[],
    cardGroups: CardGroup[],
  ) => void;
  refreshProject: (data: {
    cards: Card[];
    cardTypes: CardType[];
    relationKinds: RelationKind[];
    relations: Relation[];
    scenarios: Scenario[];
    boards: Board[];
    sessions: Session[];
    cardGroups: CardGroup[];
  }) => void;
  closeProject: () => void;

  // ── cards ──
  cards: Card[];
  cardTypes: CardType[];
  addCard: (card: Card) => void;
  updateCard: (card: Card) => void;
  removeCard: (id: string) => void;
  setCardTypes: (types: CardType[]) => void;
  upsertCardType: (type: CardType) => void;
  removeCardType: (id: string) => void;

  // ── relations ──
  relationKinds: RelationKind[];
  relations: Relation[];
  upsertRelationKind: (kind: RelationKind) => void;
  removeRelationKind: (id: string) => void;
  upsertRelation: (r: Relation) => void;
  removeRelation: (id: string) => void;

  // ── scenarios ──
  scenarios: Scenario[];
  upsertScenario: (s: Scenario) => void;
  removeScenario: (id: string) => void;

  // ── boards ──
  boards: Board[];
  upsertBoard: (b: Board) => void;
  removeBoard: (id: string) => void;

  // ── sessions ──
  sessions: Session[];
  upsertSession: (s: Session) => void;
  removeSession: (id: string) => void;

  // ── card groups ──
  cardGroups: CardGroup[];
  upsertCardGroup: (g: CardGroup) => void;
  removeCardGroup: (id: string) => void;

  // ── undo ──
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingSaves: number;
  pushUndo: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;
  incPendingSaves: () => void;
  decPendingSaves: () => void;

  // ── ui ──
  selectedCardId: string | null;
  selectedTokenId: string | null;
  selectedEdgeId: string | null;
  selectedCardTypeId: string | null;
  currentBoardId: string | null;
  currentSessionId: string | null;
  activeModule: ModuleKey;
  cardWallView: CardWallView;
  inspectorWidth: number;
  inspectorCollapsed: boolean;
  selectedCardIds: string[];
  selectedTokenIds: string[];

  selectCard: (id: string | null) => void;
  selectToken: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  selectCardType: (id: string | null) => void;
  setCurrentBoard: (id: string | null) => void;
  setCurrentSession: (id: string | null) => void;
  setActiveModule: (m: ModuleKey) => void;
  setCardWallView: (v: CardWallView) => void;
  setInspectorWidth: (w: number) => void;
  toggleInspector: () => void;
  toggleCardSelection: (id: string) => void;
  selectCardsRange: (
    fromId: string,
    toId: string,
    orderedIds: string[],
  ) => void;
  clearCardSelection: () => void;
  setCardSelection: (ids: string[]) => void;
  toggleTokenSelection: (id: string) => void;
  clearTokenSelection: () => void;
  setTokenSelection: (ids: string[]) => void;
}
