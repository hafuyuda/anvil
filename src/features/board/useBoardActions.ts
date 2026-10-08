import { ipc, type Board, type CardGroup, type Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { nowMs } from "../../lib/time";
import { newId } from "../../lib/id";
import { gridPosition, shuffle } from "./tokenPlacement";
import { usePileActions } from "./usePileActions";

interface UndoEntry {
  id: string;
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

interface Args {
  board: Board;
  upsertBoard: (b: Board) => void;
  pushUndo: (entry: UndoEntry) => void;
}

/**
 * BoardEditor 的业务逻辑集合：
 * 持久化、卡片添加、卡组导入、卡盒创建、卡盒操作、批量删除。
 * 不含任何 UI 状态。
 */
export function useBoardActions({ board, upsertBoard, pushUndo }: Args) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const deleteWithUndo = useDeleteUndo();

  async function persist(b: Board) {
    await ipc.upsertBoard(b);
    upsertBoard(b);
  }

  async function savePatch(patch: Partial<Board>, undoLabel?: string) {
    const before = board;
    const after: Board = {
      ...before,
      ...patch,
      updated_at: nowMs(),
    };
    try {
      await ipc.upsertBoard(after);
      upsertBoard(after);
      if (undoLabel) {
        pushUndo({
          id: `${Date.now()}-${newId().slice(2, 8)}`,
          label: undoLabel,
          undo: async () => {
            await persist(before);
          },
          redo: async () => {
            await persist(after);
          },
        });
      }
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  async function addCardToBoard(cardId: string) {
    const tokens = board.tokens ?? [];
    const count = tokens.length;
    const pos = gridPosition(count);

    const newToken: Token = {
      id: newId(),
      card_id: cardId,
      name_override: null,
      value_overrides: {},
      x: pos.x,
      y: pos.y,
      w: 140,
      h: 205,
      rotation: 0,
      layer: count,
      visible: true,
      face_down: false,
      pile: null,
    };

    const next: Board = {
      ...board,
      tokens: [...tokens, newToken],
      updated_at: nowMs(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
  }

  async function addPlaceholder() {
    const tokens = board.tokens ?? [];
    const count = tokens.length;
    const pos = gridPosition(count);

    const newToken: Token = {
      id: newId(),
      card_id: null,
      name_override: "占位",
      value_overrides: {},
      x: pos.x,
      y: pos.y,
      w: 140,
      h: 205,
      rotation: 0,
      layer: count,
      visible: true,
      face_down: false,
      pile: null,
    };

    const next: Board = {
      ...board,
      tokens: [...tokens, newToken],
      updated_at: nowMs(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
  }

  async function importFromGroup(group: CardGroup, shuffleOn: boolean) {
    const valid = group.card_ids.filter((id) => cards.some((c) => c.id === id));
    if (valid.length === 0) {
      alert("该卡组里没有可用的卡牌。");
      return;
    }

    const ordered = shuffleOn ? shuffle(valid) : valid;
    const existing = board.tokens ?? [];
    const startIdx = existing.length;

    const newTokens: Token[] = ordered.map((cardId, i) => {
      const pos = gridPosition(startIdx + i);
      return {
        id: newId(),
        card_id: cardId,
        name_override: null,
        value_overrides: {},
        x: pos.x,
        y: pos.y,
        w: 140,
        h: 205,
        rotation: 0,
        layer: startIdx + i,
        visible: true,
        face_down: false,
        pile: null,
      };
    });

    const next: Board = {
      ...board,
      tokens: [...existing, ...newTokens],
      updated_at: nowMs(),
    };

    try {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    } catch (e) {
      alert("导入失败: " + e);
    }
  }

  async function addPile(group: CardGroup) {
    const valid = group.card_ids.filter((id) => cards.some((c) => c.id === id));
    if (valid.length === 0) {
      alert("该卡组里没有可用的卡牌。");
      return;
    }

    const existing = board.tokens ?? [];
    const pos = gridPosition(existing.length);

    const pileToken: Token = {
      id: newId(),
      card_id: null,
      name_override: group.name,
      value_overrides: {},
      x: pos.x,
      y: pos.y,
      w: 140,
      h: 205,
      rotation: 0,
      layer: existing.length,
      visible: true,
      face_down: false,
      pile: {
        group_id: group.id,
        label: group.name,
        remaining: [...valid],
        initial: [...valid],
        total: valid.length,
      },
    };

    const next: Board = {
      ...board,
      tokens: [...existing, pileToken],
      updated_at: nowMs(),
    };

    try {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    } catch (e) {
      alert("创建卡盒失败: " + e);
    }
  }

  const { drawFromPile, shufflePile, resetPile } = usePileActions({
    tokens: board.tokens ?? [],
    applyTokens: async (next, label) => {
      await savePatch({ tokens: next }, label);
    },
  });

  async function deleteSelectedTokens(ids: string[]) {
    if (ids.length === 0) return;
    const removed = (board.tokens ?? []).filter((t) => ids.includes(t.id));

    await deleteWithUndo({
      label: `删除 ${ids.length} 个 Token`,
      do: async () => {
        const next: Board = {
          ...board,
          tokens: (board.tokens ?? []).filter((t) => !ids.includes(t.id)),
          updated_at: nowMs(),
        };
        await ipc.upsertBoard(next);
        upsertBoard(next);
      },
      restore: async () => {
        const next: Board = {
          ...board,
          tokens: [...(board.tokens ?? []), ...removed],
          updated_at: nowMs(),
        };
        await ipc.upsertBoard(next);
        upsertBoard(next);
      },
    });
  }

  return {
    savePatch,
    addCardToBoard,
    addPlaceholder,
    importFromGroup,
    addPile,
    drawFromPile,
    shufflePile,
    resetPile,
    deleteSelectedTokens,
  };
}
