import { useEffect, useMemo, useState } from "react";
import { ipc, type Board, type Card } from "../../core/ipc";
import { useOpenProject } from "../../core/useOpenProject";
import { useProjectStore } from "../../stores/projectStore";

type SortKey = "name" | "updated_at" | "type";

export function CardWall() {
  const {
    projectPath,
    cards,
    cardTypes,
    addCard,
    selectCard,
    selectedCardId,
    setProject,
  } = useProjectStore();
  const openProject = useOpenProject();

  const [query, setQuery] = useState("");
  const [ftsIds, setFtsIds] = useState<string[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);

  const boards = useProjectStore((s) => s.boards) ?? [];
  const upsertBoard = useProjectStore((s) => s.upsertBoard);

  // FTS 搜索：输入停止 150ms 后查询
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setFtsIds(null);
      return;
    }
    // 少于 3 个字符，trigram 匹配不到，直接走内存
    if (q.length < 3) {
      setFtsIds(null);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const ids = await ipc.searchCards(q, 500);
        // FTS 空结果也回退内存，避免 trigram 漏匹配
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
    const now = Date.now();
    const card: Card = {
      id: crypto.randomUUID(),
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
      ] = await Promise.all([
        ipc.listCards(),
        ipc.listCardTypes(),
        ipc.listRelationKinds(),
        ipc.listAllRelations(),
        ipc.listScenarios(),
        ipc.listBoards(),
      ]);
      setProject(
        projectPath,
        newCards,
        newTypes,
        newKinds,
        newRelations,
        newScenarios,
        newBoards,
      );
    } catch (e) {
      alert("载入示例失败: " + e);
    }
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

  async function handleAddToBoard(card: Card) {
    if (boards.length === 0) {
      alert("请先在「棋盘」里创建一个棋盘");
      return;
    }
    let targetBoard: Board | undefined;
    if (boards.length === 1) {
      targetBoard = boards[0];
    } else {
      const names = boards.map((b, i) => `${i + 1}. ${b.name}`).join("\n");
      const input = prompt(`选择棋盘：\n${names}\n\n输入序号`);
      if (!input) return;
      const idx = Number(input) - 1;
      targetBoard = boards[idx];
      if (!targetBoard) {
        alert("无效序号");
        return;
      }
    }

    const tokens = targetBoard.tokens ?? [];
    const count = tokens.length;
    const gx = 100 + (count % 8) * 100;
    const gy = 100 + Math.floor(count / 8) * 100;

    const newToken = {
      id: crypto.randomUUID(),
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
      ...targetBoard,
      tokens: [...tokens, newToken],
      updated_at: Date.now(),
    };
    await ipc.upsertBoard(next);
    upsertBoard(next);
  }
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
        {query && ftsIds && <span style={{ marginLeft: 8 }}>FTS</span>}
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "#888" }}>没有匹配的卡牌</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {visible.map((c) => (
            <li
              key={c.id}
              onClick={() => selectCard(c.id)}
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
                  handleAddToBoard(c);
                }}
                style={{ fontSize: 11 }}
                title="添加到棋盘"
              >
                → 棋盘
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
