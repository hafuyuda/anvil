import { useState } from "react";
import { ipc, type Board, type Card, type Token } from "../../../core/ipc";
import { useOpenProject } from "../../../hooks/useOpenProject";
import { useProjectStore } from "../../../stores/projectStore";
import { PickerDialog } from "../../../components/PickerDialog";
import { useDeleteUndo } from "../../../hooks/useDeleteUndo";
import { newId } from "../../../lib/id";
import { nowMs } from "../../../lib/time";
import { CardWallToolbar } from "./CardWallToolbar";
import { BulkActionBar } from "./BulkActionBar";
import { CardGridView } from "./CardGridView";
import { CardListView } from "./CardListView";
import { useCardWallFilters } from "./useCardWallFilters";
import { AddToGroupDialog } from "../../card-groups/AddToGroupDialog";

export function CardWall() {
  const {
    projectPath,
    cards,
    cardTypes,
    boards,
    setProject,
    addCard,
    selectCard,
    selectedCardId,
    selectedCardIds,
    setCardSelection,
    toggleCardSelection,
    selectCardsRange,
    clearCardSelection,
    upsertBoard,
    cardWallView,
    setCardWallView,
  } = useProjectStore();
  const openProject = useOpenProject();
  const deleteWithUndo = useDeleteUndo();

  const filters = useCardWallFilters(cards, cardTypes);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingCards, setPendingCards] = useState<Card[]>([]);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const [addToGroupOpen, setAddToGroupOpen] = useState(false);

  // ── 新建卡牌 ──

  async function handleAddCard() {
    if (cardTypes.length === 0) {
      alert("请先创建一个卡牌类型");
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
    try {
      await ipc.saveCard(card);
      addCard(card);
      selectCard(card.id);
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  // ── 载入示例世界 ──

  async function handleSeed() {
    if (!projectPath) return;
    if (!confirm("将写入示例类型和卡牌，当前项目为空才会生效。继续？")) return;
    try {
      await ipc.seedExampleWorld();
      const [
        newCards,
        newTypes,
        newKinds,
        newRelations,
        newScenarios,
        newBoards,
        newSessions,
        newCardGroups,
      ] = await Promise.all([
        ipc.listCards(),
        ipc.listCardTypes(),
        ipc.listRelationKinds(),
        ipc.listAllRelations(),
        ipc.listScenarios(),
        ipc.listBoards(),
        ipc.listSessions(),
        ipc.listCardGroups(),
      ]);
      setProject(
        projectPath,
        newCards,
        newTypes,
        newKinds,
        newRelations,
        newScenarios,
        newBoards,
        newSessions,
        newCardGroups,
      );
    } catch (e) {
      alert("载入示例失败: " + e);
    }
  }

  // ── 添加到棋盘 ──

  async function createTokensInBoard(board: Board, cardList: Card[]) {
    const tokens = [...(board.tokens ?? [])];
    const startIdx = tokens.length;

    for (let i = 0; i < cardList.length; i++) {
      const card = cardList[i];
      const n = startIdx + i;
      const gx = 100 + (n % 8) * 180;
      const gy = 100 + Math.floor(n / 8) * 240;

      const newToken: Token = {
        id: newId(),
        card_id: card.id,
        name_override: null,
        value_overrides: {},
        x: gx,
        y: gy,
        w: 140,
        h: 205,
        rotation: 0,
        layer: n,
        visible: true,
      };
      tokens.push(newToken);
    }

    const next: Board = {
      ...board,
      tokens,
      updated_at: nowMs(),
    };
    try {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    } catch (e) {
      alert("添加失败: " + e);
    }
  }

  function handleAddToBoard(cardList: Card[]) {
    if (boards.length === 0) {
      alert("请先在「棋盘」里创建一个棋盘");
      return;
    }
    if (boards.length === 1) {
      createTokensInBoard(boards[0], cardList);
      return;
    }
    setPendingCards(cardList);
    setPickerOpen(true);
  }

  // ── 批量删除 ──

  async function handleBulkDelete() {
    const ids = selectedCardIds ?? [];
    if (ids.length === 0) return;

    const cardsToDelete = (cards ?? []).filter((c) => ids.includes(c.id));
    if (cardsToDelete.length === 0) return;

    if (
      !confirm(`删除选中的 ${cardsToDelete.length} 张卡牌？可用 Ctrl+Z 撤销。`)
    )
      return;

    try {
      await deleteWithUndo({
        label: `删除 ${cardsToDelete.length} 张卡牌`,
        do: async () => {
          for (const c of cardsToDelete) {
            await ipc.deleteCard(c.id);
          }
          const state = useProjectStore.getState();
          const remaining = (state.cards ?? []).filter(
            (c) => !ids.includes(c.id),
          );
          useProjectStore.setState({
            cards: remaining,
            relations: (state.relations ?? []).filter(
              (r) => !ids.includes(r.from) && !ids.includes(r.to),
            ),
            selectedCardIds: [],
            selectedCardId: null,
          });
        },
        restore: async () => {
          for (const c of cardsToDelete) {
            await ipc.saveCard(c);
          }
          const state = useProjectStore.getState();
          useProjectStore.setState({
            cards: [...(state.cards ?? []), ...cardsToDelete],
          });
        },
      });
    } catch (e) {
      alert("删除失败: " + e);
    }
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
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--fg-primary)",
                fontFamily: "var(--font-title)",
                marginBottom: 4,
              }}
            >
              这是一个空项目
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              要不要载入「矮人铁匠铺」示例世界？
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSeed}>
            载入示例世界
          </button>
        </div>
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
        onAddToBoard={() => {
          const cardsToAdd = (cards ?? []).filter((c) =>
            selectedCardIds.includes(c.id),
          );
          handleAddToBoard(cardsToAdd);
        }}
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
            cards={filters.visible}
            cardTypes={cardTypes}
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
            onAddToBoard={(c) => handleAddToBoard([c])}
          />
        ) : (
          <CardListView
            cards={filters.visible}
            typeName={(id) =>
              cardTypes.find((t) => t.id === id)?.name ?? id.slice(0, 8)
            }
            selectedCardIds={selectedCardIds}
            onCardClick={handleCardClick}
            onAddToBoard={(c) => handleAddToBoard([c])}
          />
        )}
      </div>

      {pickerOpen && pendingCards.length > 0 && (
        <PickerDialog
          title={`添加 ${pendingCards.length} 张卡到棋盘`}
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          onPick={(id) => {
            const b = boards.find((x) => x.id === id);
            if (b) createTokensInBoard(b, pendingCards);
          }}
          onClose={() => {
            setPickerOpen(false);
            setPendingCards([]);
          }}
        />
      )}

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
            alert(`已把 ${added} 张卡加入「${groupName}」。`);
          }}
        />
      )}
    </div>
  );
}
