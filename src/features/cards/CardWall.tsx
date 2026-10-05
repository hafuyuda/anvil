import { useEffect, useMemo, useState } from "react";
import { ipc, type Board, type Card, type Token } from "../../core/ipc";
import { useOpenProject } from "../../core/useOpenProject";
import { useProjectStore } from "../../stores/projectStore";
import { PickerDialog } from "../../components/PickerDialog";
import { CardFrame } from "../../components/CardFrame";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

type SortKey = "name" | "updated_at" | "type";

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
    upsertBoard,
    cardWallView,
    setCardWallView,
  } = useProjectStore();
  const openProject = useOpenProject();

  const [query, setQuery] = useState("");
  const [ftsIds, setFtsIds] = useState<string[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);

  // FTS 搜索：输入停止 150ms 后查询，短查询直接走内存
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 3) {
      setFtsIds(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const ids = await ipc.searchCards(q, 500);
        setFtsIds(ids.length > 0 ? ids : null);
      } catch {
        setFtsIds(null);
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleAddCard() {
    if (cardTypes.length === 0) {
      alert("请先创建一个卡牌类型");
      return;
    }
    const now = nowMs();
    const card: Card = {
      id: newId(),
      type_id: cardTypes[0].id,
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
      ] = await Promise.all([
        ipc.listCards(),
        ipc.listCardTypes(),
        ipc.listRelationKinds(),
        ipc.listAllRelations(),
        ipc.listScenarios(),
        ipc.listBoards(),
        ipc.listSessions(),
      ]);
      setProject(
        projectPath,
        newCards,
        newTypes,
        newKinds,
        newRelations,
        newScenarios,
        newBoards,
        newSessions
      );
    } catch (e) {
      alert("载入示例失败: " + e);
    }
  }

  async function createTokenInBoard(board: Board, card: Card) {
    const tokens = board.tokens ?? [];
    const count = tokens.length;
    const gx = 100 + (count % 8) * 100;
    const gy = 100 + Math.floor(count / 8) * 100;

    const newToken: Token = {
      id: newId(),
      card_id: card.id,
      name_override: null,
      value_overrides: {},
      x: gx,
      y: gy,
      w: 80,
      h: 80,
      rotation: 0,
      layer: 0,
      visible: true,
    };

    const next: Board = {
      ...board,
      tokens: [...tokens, newToken],
      updated_at: nowMs(),
    };

    try {
      await ipc.upsertBoard(next);
      upsertBoard(next);
    } catch (e) {
      alert("添加失败: " + e);
    }
  }

  function handleAddToBoard(card: Card) {
    if (boards.length === 0) {
      alert("请先在「棋盘」里创建一个棋盘");
      return;
    }
    if (boards.length === 1) {
      createTokenInBoard(boards[0], card);
      return;
    }
    setPendingCard(card);
    setPickerOpen(true);
  }

  const typeName = (typeId: string) =>
    cardTypes.find((t) => t.id === typeId)?.name ?? typeId.slice(0, 8);

  const visible = useMemo(() => {
    let list = cards;
    const q = query.trim();
    if (q) {
      if (ftsIds && ftsIds.length > 0) {
        const set = new Set(ftsIds);
        list = list.filter((c) => set.has(c.id));
      } else {
        const lower = q.toLowerCase();
        list = list.filter((c) => {
          if (c.name.toLowerCase().includes(lower)) return true;
          return Object.values(c.values).some((v) =>
            typeof v === "string" ? v.toLowerCase().includes(lower) : false
          );
        });
      }
    }
    if (typeFilter) {
      list = list.filter((c) => c.type_id === typeFilter);
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "updated_at") cmp = a.updated_at - b.updated_at;
      else cmp = typeName(a.type_id).localeCompare(typeName(b.type_id));
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [cards, query, ftsIds, typeFilter, sortKey, sortAsc, cardTypes]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  }

  const isEmpty = cards.length === 0 && cardTypes.length === 0;

  return (
    <div>
      {projectPath && isEmpty && (
        <div
          style={{
            padding: 16,
            marginBottom: 12,
            background: "#f6f3ec",
            border: "1px solid #e4dcc8",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            这是一个空项目。要不要载入「矮人铁匠铺」示例世界？
          </div>
          <button onClick={handleSeed}>载入示例世界</button>
        </div>
      )}

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={openProject}>切换项目</button>
        <button onClick={handleAddCard} disabled={!projectPath}>
          新建卡牌
        </button>
        <input
          placeholder="搜索名称或字段"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "4px 8px", width: 200, fontSize: 12 }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 12 }}
        >
          <option value="">全部类型</option>
          {cardTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setCardWallView("card")}
            style={{
              fontSize: 12,
              fontWeight: cardWallView === "card" ? 600 : 400,
              background: cardWallView === "card" ? "#e0e0e0" : "transparent",
              border: "1px solid #ddd",
            }}
            title="卡牌视图"
          >
            ▦ 卡牌
          </button>
          <button
            onClick={() => setCardWallView("list")}
            style={{
              fontSize: 12,
              fontWeight: cardWallView === "list" ? 600 : 400,
              background: cardWallView === "list" ? "#e0e0e0" : "transparent",
              border: "1px solid #ddd",
            }}
            title="列表视图"
          >
            ☰ 列表
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button
            onClick={() => toggleSort("name")}
            style={{ fontSize: 12, fontWeight: sortKey === "name" ? 600 : 400 }}
          >
            名称 {sortKey === "name" ? (sortAsc ? "↑" : "↓") : ""}
          </button>
          <button
            onClick={() => toggleSort("type")}
            style={{ fontSize: 12, fontWeight: sortKey === "type" ? 600 : 400 }}
          >
            类型 {sortKey === "type" ? (sortAsc ? "↑" : "↓") : ""}
          </button>
          <button
            onClick={() => toggleSort("updated_at")}
            style={{
              fontSize: 12,
              fontWeight: sortKey === "updated_at" ? 600 : 400,
            }}
          >
            更新 {sortKey === "updated_at" ? (sortAsc ? "↑" : "↓") : ""}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
        {visible.length} / {cards.length}
        {query && ftsIds && ftsIds.length > 0 && (
          <span style={{ marginLeft: 8 }}>FTS</span>
        )}
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "#888" }}>没有匹配的卡牌</p>
      ) : cardWallView === "card" ? (
        <CardGridView
          cards={visible}
          cardTypes={cardTypes}
          selectedCardId={selectedCardId}
          onSelect={selectCard}
          onAddToBoard={handleAddToBoard}
        />
      ) : (
        <CardListView
          cards={visible}
          typeName={typeName}
          selectedCardId={selectedCardId}
          onSelect={selectCard}
          onAddToBoard={handleAddToBoard}
        />
      )}

      {pickerOpen && pendingCard && (
        <PickerDialog
          title="选择棋盘"
          options={boards.map((b) => ({ value: b.id, label: b.name }))}
          onPick={(id) => {
            const b = boards.find((x) => x.id === id);
            if (b) createTokenInBoard(b, pendingCard);
          }}
          onClose={() => {
            setPickerOpen(false);
            setPendingCard(null);
          }}
        />
      )}
    </div>
  );
}

// ============ 卡牌网格视图 ============

function CardGridView({
  cards,
  cardTypes,
  selectedCardId,
  onSelect,
  onAddToBoard,
}: {
  cards: Card[];
  cardTypes: import("../../core/ipc").CardType[];
  selectedCardId: string | null;
  onSelect: (id: string) => void;
  onAddToBoard: (c: Card) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        paddingTop: 4,
      }}
    >
      {cards.map((c) => {
        const ct = cardTypes.find((t) => t.id === c.type_id);
        if (!ct) {
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                width: 190,
                height: 280,
                border: "1px dashed #c33",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "#c33",
                cursor: "pointer",
              }}
            >
              找不到类型
            </div>
          );
        }

        return (
          <div key={c.id} style={{ position: "relative" }}>
            <CardFrame
              card={c}
              cardType={ct}
              size="medium"
              selected={selectedCardId === c.id}
              onClick={() => onSelect(c.id)}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToBoard(c);
              }}
              title="添加到棋盘"
              style={{
                position: "absolute",
                right: 4,
                top: 4,
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.6)",
                background: "rgba(0,0,0,0.4)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              → 棋盘
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ============ 列表视图 ============

function CardListView({
  cards,
  typeName,
  selectedCardId,
  onSelect,
  onAddToBoard,
}: {
  cards: Card[];
  typeName: (id: string) => string;
  selectedCardId: string | null;
  onSelect: (id: string) => void;
  onAddToBoard: (c: Card) => void;
}) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {cards.map((c) => (
        <li
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{
            cursor: "pointer",
            padding: "6px 8px",
            borderRadius: 4,
            background: selectedCardId === c.id ? "#eef" : "transparent",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>
            {c.name} ·{" "}
            <span style={{ color: "#888" }}>{typeName(c.type_id)}</span> —{" "}
            <span style={{ color: "#aaa", fontSize: 12 }}>
              {c.id.slice(0, 8)}
            </span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToBoard(c);
            }}
            style={{ fontSize: 11 }}
            title="添加到棋盘"
          >
            → 棋盘
          </button>
        </li>
      ))}
    </ul>
  );
}