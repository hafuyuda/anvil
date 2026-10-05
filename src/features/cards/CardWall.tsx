import { useEffect, useMemo, useState } from "react";
import { ipc, type Board, type Card, type Token } from "../../core/ipc";
import { useOpenProject } from "../../core/useOpenProject";
import { useProjectStore } from "../../stores/projectStore";
import { PickerDialog } from "../../components/PickerDialog";
import { CardFrame } from "../../components/CardFrame";
import { Toolbar, ToolbarSpacer } from "../../components/Toolbar";
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
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const [pendingCard, setPendingCard] = useState<Card | null>(null);

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
        newSessions,
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
            typeof v === "string" ? v.toLowerCase().includes(lower) : false,
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

      <Toolbar>
        <button className="btn" onClick={openProject}>
          切换项目
        </button>
        <button
          className="btn btn-primary"
          onClick={handleAddCard}
          disabled={!projectPath}
        >
          + 新建卡牌
        </button>

        <input
          className="input"
          placeholder="搜索名称或字段"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 200 }}
        />

        <select
          className="select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: 130 }}
        >
          <option value="">全部类型</option>
          {cardTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 2 }}>
          <button
            className="btn btn-icon"
            onClick={() => setCardWallView("card")}
            title="卡牌视图"
            style={{
              background:
                cardWallView === "card" ? "var(--bg-raised)" : "transparent",
              borderColor:
                cardWallView === "card"
                  ? "var(--accent-gold)"
                  : "var(--border-default)",
            }}
          >
            ▦
          </button>
          <button
            className="btn btn-icon"
            onClick={() => setCardWallView("list")}
            title="列表视图"
            style={{
              background:
                cardWallView === "list" ? "var(--bg-raised)" : "transparent",
              borderColor:
                cardWallView === "list"
                  ? "var(--accent-gold)"
                  : "var(--border-default)",
            }}
          >
            ☰
          </button>
        </div>

        <ToolbarSpacer />

        <button
          className="btn btn-ghost"
          onClick={() => toggleSort("name")}
          style={{
            fontWeight: sortKey === "name" ? 600 : 400,
            color:
              sortKey === "name" ? "var(--fg-primary)" : "var(--fg-secondary)",
          }}
        >
          名称 {sortKey === "name" ? (sortAsc ? "↑" : "↓") : ""}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => toggleSort("type")}
          style={{
            fontWeight: sortKey === "type" ? 600 : 400,
            color:
              sortKey === "type" ? "var(--fg-primary)" : "var(--fg-secondary)",
          }}
        >
          类型 {sortKey === "type" ? (sortAsc ? "↑" : "↓") : ""}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => toggleSort("updated_at")}
          style={{
            fontWeight: sortKey === "updated_at" ? 600 : 400,
            color:
              sortKey === "updated_at"
                ? "var(--fg-primary)"
                : "var(--fg-secondary)",
          }}
        >
          更新 {sortKey === "updated_at" ? (sortAsc ? "↑" : "↓") : ""}
        </button>
      </Toolbar>

      <div
        style={{
          padding: "6px 16px",
          fontSize: 11,
          color: "var(--fg-muted)",
          flexShrink: 0,
        }}
      >
        {visible.length} / {cards.length}
        {query && ftsIds && ftsIds.length > 0 && (
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
      >
        {visible.length === 0 ? (
          <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>
            没有匹配的卡牌
          </p>
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
      </div>

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
    </div>
  );
}

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
                border: "1px dashed var(--danger)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "var(--danger)",
                cursor: "pointer",
                background: "var(--bg-panel)",
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
              className="btn btn-icon"
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
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
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
      {cards.map((c) => {
        const active = selectedCardId === c.id;
        return (
          <li
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: "var(--radius-sm)",
              background: active ? "var(--bg-raised)" : "transparent",
              borderLeft: active
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
            }}
          >
            <span style={{ flex: 1 }}>
              {c.name}{" "}
              <span style={{ color: "var(--fg-muted)", fontSize: 12 }}>
                · {typeName(c.type_id)}
              </span>{" "}
              <span
                style={{
                  color: "var(--fg-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {c.id.slice(0, 8)}
              </span>
            </span>
            <button
              className="btn btn-icon"
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
        );
      })}
    </ul>
  );
}
