import { ipc, type Board, type CardGroup, type Token } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { useDeleteUndo } from "../../hooks/useDeleteUndo";
import { nowMs } from "../../lib/time";
import { newId, makeUndoId } from "../../lib/id";
import { mergeEntity } from "../../lib/undoMerge";
import { gridPosition, shuffle } from "./tokenPlacement";
import { deletePayload, placePayload } from "./delta";
import { toast } from "../../lib/toast";
import { runWithError } from "../../lib/runWithError";

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
  /**
   * 记牌谱。由 BoardEditor 传入（那里持有 useBoardEvents 的本地列表）。
   * 不传则只改棋盘、不记历史。
   */
  logEvent?: (kind: string, payload: unknown) => Promise<void>;
}

/**
 * 检查新 token 是否超出棋盘边界，超出则返回扩充后的新宽高。
 * 返回 null 表示无需扩充。
 *
 * 修复：原来 maxX / maxY 以 currentW / currentH 为初值，导致
 * newW 恒 >= currentW + 100，每次添加都撑大棋盘。
 * 现在改为算 token 的真实边界，棋盘尺寸只增不减。
 */
function computeBoardExpansion(
  tokens: Token[],
  currentW: number,
  currentH: number,
): { width: number; height: number } | null {
  let realMaxX = 0;
  let realMaxY = 0;
  for (const t of tokens) {
    const w = t.w ?? 140;
    const h = t.h ?? 205;
    realMaxX = Math.max(realMaxX, t.x + w);
    realMaxY = Math.max(realMaxY, t.y + h);
  }
  // 在 token 边界外预留一格，按 100px 取整；下界为当前棋盘尺寸
  const newW = Math.max(currentW, Math.ceil((realMaxX + 180) / 100) * 100);
  const newH = Math.max(currentH, Math.ceil((realMaxY + 240) / 100) * 100);
  if (newW === currentW && newH === currentH) return null;
  return { width: newW, height: newH };
}

/**
 * 已有 token 的最大 layer + 1。
 *
 * 修复：原来直接用 tokens.length 分配 layer，
 * 删除后添加会产生重复值（如 layers = [0,1,3,4]，再加一个还是 4）。
 */
function nextLayerBase(tokens: Token[]): number {
  return tokens.reduce((m, t) => Math.max(m, t.layer), -1) + 1;
}

/**
 * BoardEditor 的业务逻辑集合：
 * 持久化、卡片添加、卡组导入、卡盒创建、批量删除。
 * 不含任何 UI 状态。
 *
 * 卡盒抽牌 / 洗牌 / 重置由 BoardEditor 直接调用 usePileActions
 * （那里带了 bounds，用于抽牌时的边界判断），本 hook 不重复创建。
 */
export function useBoardActions({ board, upsertBoard, pushUndo, logEvent }: Args) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const deleteWithUndo = useDeleteUndo();

  /** 卡牌显示名。card_id 为空（占位 / 卡盒）时退回传入的默认值。 */
  function nameOf(cardId: string | null | undefined, fallback = "未命名") {
    if (!cardId) return fallback;
    return cards.find((c) => c.id === cardId)?.name ?? fallback;
  }

  async function persist(b: Board) {
    await ipc.upsertBoard(b);
    upsertBoard(b);
  }

  /**
   * 撤销 / 重做时从 store 读当前棋盘。
   * 不能信闭包里那份 —— 用户在删除之后又拖了下别的 Token，旧快照会把它吞掉。
   */
  function currentBoard(): Board | null {
    return useProjectStore.getState().boards.find((b) => b.id === board.id) ?? null;
  }

  async function savePatch(patch: Partial<Board>, undoLabel?: string) {
    const before = board;
    const after: Board = {
      ...before,
      ...patch,
      updated_at: nowMs(),
    };
    await runWithError(async () => {
      await ipc.upsertBoard(after);
      upsertBoard(after);
      if (undoLabel) {
        pushUndo({
          id: makeUndoId(),
          label: undoLabel,
          undo: async () => {
            // 棋盘被删了才整体写回 before，否则只回滚本次改过的字段
            const cur = currentBoard();
            await persist(cur ? mergeEntity(before, after, cur) : before);
          },
          redo: async () => {
            const cur = currentBoard();
            await persist(cur ? mergeEntity(after, before, cur) : after);
          },
        });
      }
    }, "保存失败");
  }

  async function addCardsToBoard(cardIds: string[]) {
    if (cardIds.length === 0) return;
    const existing = board.tokens ?? [];
    const layerBase = nextLayerBase(existing);
    const posBase = existing.length;

    const newTokens: Token[] = cardIds.map((cardId, i) => {
      const pos = gridPosition(posBase + i);
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
        layer: layerBase + i,
        visible: true,
        face_down: false,
        pile: null,
      };
    });

    const allTokens = [...existing, ...newTokens];
    const expansion = computeBoardExpansion(
      allTokens,
      board.width,
      board.height,
    );

    const next: Board = {
      ...board,
      tokens: allTokens,
      ...(expansion ?? {}),
      updated_at: nowMs(),
    };

    await runWithError(async () => {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    }, "添加失败");

    if (logEvent) {
      const names = cardIds.map((id) => nameOf(id, "未知卡牌"));
      void logEvent(
        "board.place",
        placePayload({
          tokens: newTokens,
          source: "cards",
          cardIds,
          summary:
            cardIds.length === 1
              ? `落子「${names[0]}」`
              : `落子 ${cardIds.length} 张卡牌`,
        }),
      );
    }
  }

  async function addCardToBoard(cardId: string) {
    await addCardsToBoard([cardId]);
  }

  async function addPlaceholder() {
    const tokens = board.tokens ?? [];
    const pos = gridPosition(tokens.length);

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
      layer: nextLayerBase(tokens),
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

    if (logEvent) {
      void logEvent(
        "board.place",
        placePayload({
          tokens: [newToken],
          source: "placeholder",
          summary: "添加占位 Token",
        }),
      );
    }
  }

  async function importFromGroup(group: CardGroup, shuffleOn: boolean) {
    const valid = group.card_ids.filter((id) => cards.some((c) => c.id === id));
    if (valid.length === 0) {
      toast.info("该卡组里没有可用的卡牌。");
      return;
    }

    const ordered = shuffleOn ? shuffle(valid) : valid;
    const existing = board.tokens ?? [];
    const layerBase = nextLayerBase(existing);
    const posBase = existing.length;

    const newTokens: Token[] = ordered.map((cardId, i) => {
      const pos = gridPosition(posBase + i);
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
        layer: layerBase + i,
        visible: true,
        face_down: false,
        pile: null,
      };
    });

    const allTokens = [...existing, ...newTokens];
    const expansion = computeBoardExpansion(
      allTokens,
      board.width,
      board.height,
    );

    const next: Board = {
      ...board,
      tokens: allTokens,
      ...(expansion ?? {}),
      updated_at: nowMs(),
    };

    await runWithError(async () => {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    }, "导入失败");

    if (logEvent) {
      void logEvent(
        "board.place",
        placePayload({
          tokens: newTokens,
          source: "group",
          cardIds: ordered,
          summary: `从卡组「${group.name}」导入 ${ordered.length} 张${
            shuffleOn ? "（洗过）" : ""
          }`,
        }),
      );
    }
  }

  async function addPile(group: CardGroup) {
    const valid = group.card_ids.filter((id) => cards.some((c) => c.id === id));
    if (valid.length === 0) {
      toast.info("该卡组里没有可用的卡牌。");
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
      layer: nextLayerBase(existing),
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

    const allTokens = [...existing, pileToken];
    const expansion = computeBoardExpansion(
      allTokens,
      board.width,
      board.height,
    );

    const next: Board = {
      ...board,
      tokens: allTokens,
      ...(expansion ?? {}),
      updated_at: nowMs(),
    };

    await runWithError(async () => {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    }, "创建卡盒失败");

    if (logEvent) {
      void logEvent(
        "board.place",
        placePayload({
          tokens: [pileToken],
          source: "pile",
          summary: `创建卡盒「${group.name}」（${valid.length} 张）`,
        }),
      );
    }
  }

  async function deleteSelectedTokens(ids: string[]) {
    if (ids.length === 0) return;
    const before = board;
    const after: Board = {
      ...before,
      tokens: (before.tokens ?? []).filter((t) => !ids.includes(t.id)),
      updated_at: nowMs(),
    };

    await deleteWithUndo({
      label: `删除 ${ids.length} 个 Token`,
      do: async () => {
        await persist(after);
      },
      restore: async () => {
        // 按 id 合并回当前棋盘：删掉的 token 插回原索引，
        // 用户在删除之后对别的 token 做的改动不受影响
        const cur = currentBoard();
        await persist(cur ? mergeEntity(before, after, cur) : before);
      },
      redo: async () => {
        const cur = currentBoard();
        await persist(cur ? mergeEntity(after, before, cur) : after);
      },
    });

    if (logEvent) {
      const removed = (before.tokens ?? []).filter((t) => ids.includes(t.id));
      const names = removed.map((t) =>
        t.pile
          ? `${t.name_override ?? "卡盒"}`
          : (t.name_override ?? nameOf(t.card_id, "占位")),
      );
      void logEvent(
        "board.delete",
        deletePayload({
          removed,
          summary:
            removed.length === 1
              ? `删除「${names[0]}」`
              : `删除 ${removed.length} 个 Token`,
        }),
      );
    }
  }

  return {
    savePatch,
    addCardToBoard,
    addCardsToBoard,
    addPlaceholder,
    importFromGroup,
    addPile,
    deleteSelectedTokens,
  };
}
