import { useMemo, useRef, useState } from "react";
import { ipc, type Card, type CardType } from "../../../core/ipc";
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
import { toast } from "../../../lib/toast";
import { confirmRefAwareDelete } from "../../../lib/refAwareDelete";
import { reloadIntoStore } from "../../../core/actions/reloadIntoStore";
import {
  captureCardFootprint,
  restoreCardFootprints,
} from "../../../core/actions/entityUndo";
import { runWithError } from "../../../lib/runWithError";
import { PickerDialog } from "../../../components/overlay/PickerDialog";

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

  // ── 批量删除 ──

  async function handleBulkDelete() {
    const ids = selectedCardIds ?? [];
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

  // ── 卡片点击（含多选修饰）──

  function handleCardClick(card: Card, e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey) {
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
          <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>
            没有匹配的卡牌
          </p>
        ) : cardWallView === "card" ? (
          <CardGridView
            cards={rendered}
            cardTypes={cardTypes}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
          />
        ) : (
          <CardListView
            cards={rendered}
            typeName={(id) => typeMap.get(id)?.name ?? id.slice(0, 8)}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
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
    </div>
  );
}
