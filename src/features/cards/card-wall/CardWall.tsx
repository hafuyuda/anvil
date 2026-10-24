import { useEffect, useMemo, useRef, useState } from "react";
import { ipc, type Card, type CardType, type Token } from "../../../core/ipc";
import { useOpenProject } from "../../../core/actions/useOpenProject";
import { useProjectStore } from "../../../stores/projectStore";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { newId } from "../../../lib/id";
import { nowMs } from "../../../lib/time";
import { CardWallToolbar } from "./CardWallToolbar";
import { BulkActionBar } from "./BulkActionBar";
import { CardGridView } from "./CardGridView";
import { CardListView } from "./CardListView";
import { useCardWallFilters } from "./useCardWallFilters";
import { useCardWallFlip } from "./useCardWallFlip";
import { AddToGroupDialog } from "../../card-groups/AddToGroupDialog";
import { isModified } from "../../../lib/keyboard";
import { toast } from "../../../lib/toast";
import { confirmRefAwareDelete } from "../../../lib/refAwareDelete";
import { reloadIntoStore } from "../../../core/actions/reloadIntoStore";
import {
  captureCardFootprint,
  restoreCardFootprints,
} from "../../../core/actions/entityUndo";
import { runWithError } from "../../../lib/runWithError";
import { PickerDialog } from "../../../components/overlay/PickerDialog";
import { useContextMenu, type MenuEntry } from "../../../components/ui/ContextMenu";
import { gridPosition } from "../../board/tokenPlacement";

/**
 * 首屏渲染多少张。再多就只渲染前面这些，下面挂「加载更多」。
 *
 * 不做真虚拟列表有两个原因：卡片高度相对固定但 GridCard 外层高度仍由
 * CardFrame 决定，量不准；而限额 + 按需加载是既有交互，用户往上翻本来
 * 就要点一下。更重要的是它是下面几项的前置 —— 翻牌双面 DOM、箔样倾斜
 * 监听、FLIP 的 rect 测量，全都会把「每卡成本」乘上渲染数量。
 */
const RENDER_LIMIT = 240;
const LOAD_STEP = 240;

export function CardWall() {
  const {
    projectPath,
    cards,
    cardTypes,

    addCard,
    selectCard,
    selectedCardId,
    selectedCardIds,
    setCardSelection,
    toggleCardSelection,
    selectCardsRange,
    clearCardSelection,

    cardWallView,
    setCardWallView,
  } = useProjectStore();
  const openProject = useOpenProject();
  const deleteWithUndo = useDeleteUndo();

  const filters = useCardWallFilters(cards, cardTypes);

  const typeMap = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const t of cardTypes) m.set(t.id, t);
    return m;
  }, [cardTypes]);

  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const [addToGroupOpen, setAddToGroupOpen] = useState(false);

  // ── 限额渲染 ──
  // 筛选条件一变就回到默认限额：否则搜「龙」出来 3 张，
  // 上一次加载的 2000 张会把它们埋在后面
  const filterKey = [
    filters.query,
    filters.typeFilter,
    filters.sortKey,
    String(filters.sortAsc),
    cardWallView,
  ].join("|");
  const [visibleCount, setVisibleCount] = useState(RENDER_LIMIT);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setVisibleCount(RENDER_LIMIT);
  }
  const rendered = filters.visible.slice(0, visibleCount);
  const remaining = filters.visible.length - rendered.length;

  // ── FLIP 过渡 ──
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  useCardWallFlip(scrollRef, filterKey, !reducedMotion);

  // ── 离开卡牌墙即清空选中态 ──
  // 选中态存在模块级 Zustand 单例里，不会随组件卸载自动消失。
  // 切到其它模块时 CardWall 会被 <div key={activeModule}> 卸载，这里在
  // 卸载时清掉单选 + 多选，避免绕一圈回来还残留着旧高亮/批量选区，
  // 也顺手收起跟随它的检查器（检查器读的是 selectedCardId）。
  useEffect(() => {
    return () => {
      clearCardSelection();
    };
  }, [clearCardSelection]);

  // ── 新建卡牌 ──

  async function handleAddCard() {
    if (cardTypes.length === 0) {
      toast.info("请先创建一个卡牌类型");
      return;
    }
    if (cardTypes.length === 1) {
      await createCardOfType(cardTypes[0].id);
      return;
    }
    setTypePickerOpen(true);
  }

  async function createCardOfType(typeId: string) {
    const now = nowMs();
    const card: Card = {
      id: newId(),
      type_id: typeId,
      name: "新卡",
      values: {},
      created_at: now,
      updated_at: now,
    };
    await runWithError(async () => {
      await ipc.saveCard(card);
      addCard(card);
      selectCard(card.id);
    }, "保存失败");
  }

  // ── 删除（单张或批量，复用同一套引用感知确认 + 撤销）──

  async function deleteCards(ids: string[]) {
    if (ids.length === 0) return;

    const cardsToDelete = (cards ?? []).filter((c) => ids.includes(c.id));
    if (cardsToDelete.length === 0) return;

    const clearMode = await confirmRefAwareDelete(
      cardsToDelete.map((c) => ({ kind: "card" as const, id: c.id, name: c.name })),
    );
    if (!clearMode) return;

    // 删除前给每张卡采集关系网足迹，撤销时整批放回去
    const footprints = cardsToDelete.map((c) => captureCardFootprint(c.id));

    await runWithError(
      () =>
        deleteWithUndo({
          label: `删除 ${cardsToDelete.length} 张卡牌`,
          do: async () => {
            for (const c of cardsToDelete) {
              await ipc.deleteCard(c.id, clearMode);
            }
            useProjectStore.setState({
              selectedCardIds: [],
              selectedCardId: null,
            });
            // 后端连带摘了棋子、卡盒、关系、卡组成员，store 要整体跟上
            await reloadIntoStore();
          },
          restore: async () => {
            await restoreCardFootprints(footprints);
          },
        }),
      "删除失败",
    );
  }

  function handleBulkDelete() {
    void deleteCards(selectedCardIds ?? []);
  }

  // ── 卡片点击（含多选修饰）──

  function handleCardClick(card: Card, e: React.MouseEvent) {
    if (isModified(e)) {
      toggleCardSelection(card.id);
      return;
    }
    if (e.shiftKey) {
      const anchor = selectedCardId;
      if (anchor) {
        selectCardsRange(
          anchor,
          card.id,
          filters.visible.map((c) => c.id),
        );
        return;
      }
    }
    selectCard(card.id);
  }

  // ── 右键菜单 ──
  const ctx = useContextMenu();

  async function duplicateCard(card: Card) {
    const copy: Card = {
      ...card,
      id: newId(),
      name: card.name + " 副本",
      created_at: nowMs(),
      updated_at: nowMs(),
    };
    await runWithError(async () => {
      await ipc.saveCard(copy);
      addCard(copy);
      selectCard(copy.id);
    }, "复制失败");
  }

  async function addToCurrentBoard(cardId: string) {
    const st = useProjectStore.getState();
    const board = st.boards.find((b) => b.id === st.currentBoardId);
    if (!board) {
      toast.info("先在左侧切换到棋盘模块并打开一个棋盘");
      return;
    }
    const tokens = board.tokens ?? [];
    const pos = gridPosition(tokens.length);
    const maxLayer = tokens.reduce((m, x) => Math.max(m, x.layer), -1);
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
      layer: maxLayer + 1,
      visible: true,
      face_down: false,
      pile: null,
    };
    const next = { ...board, tokens: [...tokens, newToken] };
    await runWithError(async () => {
      await ipc.upsertBoard(next);
      st.upsertBoard(next);
    }, "加入棋盘失败");
    toast.success("已加入当前棋盘");
  }

  function handleCardContextMenu(card: Card, e: React.MouseEvent) {
    const current = useProjectStore.getState().selectedCardIds ?? [];
    const isInMulti = current.length > 1 && current.includes(card.id);
    if (!current.includes(card.id)) setCardSelection([card.id]);
    const targetIds = isInMulti ? current : [card.id];
    const n = targetIds.length;

    const items: MenuEntry[] = [
      { label: n > 1 ? `加入卡组（${n} 张）` : "加入卡组", onClick: () => setAddToGroupOpen(true) },
      { label: "复制卡牌", onClick: () => void duplicateCard(card) },
      { label: "加入当前棋盘", onClick: () => void addToCurrentBoard(card.id) },
      { type: "divider" },
      {
        label: n > 1 ? `删除（${n} 张）` : "删除",
        danger: true,
        onClick: () => void deleteCards(targetIds),
      },
    ];
    ctx.open(e, items);
  }

  const selectionCount = (selectedCardIds ?? []).length;
  const isEmpty = cards.length === 0 && cardTypes.length === 0;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      {projectPath && isEmpty && (
        <div
          style={{
            margin: 12,
            padding: 16,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        ></div>
      )}

      <CardWallToolbar
        projectPath={projectPath}
        cardTypes={cardTypes}
        onOpenProject={openProject}
        onAddCard={handleAddCard}
        query={filters.query}
        setQuery={filters.setQuery}
        typeFilter={filters.typeFilter}
        setTypeFilter={filters.setTypeFilter}
        cardWallView={cardWallView}
        setCardWallView={setCardWallView}
        sortKey={filters.sortKey}
        sortAsc={filters.sortAsc}
        toggleSort={filters.toggleSort}
      />

      <BulkActionBar
        count={selectionCount}
        visibleCount={filters.visible.length}
        onSelectAllVisible={() =>
          setCardSelection(filters.visible.map((c) => c.id))
        }
        onClearSelection={clearCardSelection}
        onAddToGroup={() => setAddToGroupOpen(true)}
        onDelete={handleBulkDelete}
      />

      <div
        style={{
          padding: "6px 16px",
          fontSize: 11,
          color: "var(--fg-muted)",
          flexShrink: 0,
        }}
      >
        {filters.visible.length} / {cards.length}
        {filters.isFtsActive && (
          <span style={{ marginLeft: 8, color: "var(--accent-gold)" }}>
            FTS
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: "0 16px 16px",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            clearCardSelection();
          }
        }}
      >
        {filters.visible.length === 0 ? (
          <p className="muted">
            没有匹配的卡牌
          </p>
        ) : cardWallView === "card" ? (
          <CardGridView
            cards={rendered}
            cardTypes={cardTypes}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
            onCardContextMenu={handleCardContextMenu}
          />
        ) : (
          <CardListView
            cards={rendered}
            typeName={(id) => typeMap.get(id)?.name ?? id.slice(0, 8)}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
            onCardContextMenu={handleCardContextMenu}
          />
        )}

        {remaining > 0 && (
          <button
            className="btn btn-ghost"
            onClick={() => setVisibleCount((n) => n + LOAD_STEP)}
            style={{
              display: "block",
              margin: "16px auto 0",
              fontSize: 12,
              color: "var(--fg-secondary)",
            }}
          >
            加载更多（还有 {remaining} 张未渲染）
          </button>
        )}
      </div>

      {typePickerOpen && (
        <PickerDialog
          title="选择卡牌类型"
          options={cardTypes.map((t) => ({ value: t.id, label: t.name }))}
          onPick={(id) => {
            void createCardOfType(id);
          }}
          onClose={() => setTypePickerOpen(false)}
        />
      )}

      {addToGroupOpen && (
        <AddToGroupDialog
          cardIds={selectedCardIds}
          onClose={() => setAddToGroupOpen(false)}
          onDone={(groupName, added) => {
            setAddToGroupOpen(false);
            clearCardSelection();
            toast.success(`已把 ${added} 张卡加入「${groupName}」。`);
          }}
        />
      )}

      {ctx.node}
    </div>
  );
}
