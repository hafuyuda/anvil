import type { CardType } from "../../../core/ipc";
import { Toolbar, ToolbarSpacer } from "../../../components/Toolbar";
import type { SortKey } from "./useCardWallFilters";
import type { CardWallView } from "../../../stores/projectStore";

interface Props {
  projectPath: string | null;
  cardTypes: CardType[];
  onOpenProject: () => void;
  onAddCard: () => void;

  query: string;
  setQuery: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;

  cardWallView: CardWallView;
  setCardWallView: (v: CardWallView) => void;

  sortKey: SortKey;
  sortAsc: boolean;
  toggleSort: (k: SortKey) => void;
}

export function CardWallToolbar({
  projectPath,
  cardTypes,
  onOpenProject,
  onAddCard,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  cardWallView,
  setCardWallView,
  sortKey,
  sortAsc,
  toggleSort,
}: Props) {
  return (
    <Toolbar>
      <button className="btn" onClick={onOpenProject}>
        切换项目
      </button>
      <button
        className="btn btn-primary"
        onClick={onAddCard}
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
  );
}
