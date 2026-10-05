import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProjectStore } from "../../stores/projectStore";
import { buildGraph } from "./graphLayout";
import { Toolbar, ToolbarSpacer } from "../../components/Toolbar";

export function GraphView() {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const selectCard = useProjectStore((s) => s.selectCard);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");

  const raw = useMemo(
    () =>
      buildGraph(
        cards,
        relations,
        (typeId) =>
          cardTypes.find((t) => t.id === typeId)?.name ?? typeId.slice(0, 8),
        (kindId) => relationKinds.find((k) => k.id === kindId)?.name ?? kindId,
      ),
    [cards, relations, cardTypes, relationKinds],
  );

  const matchMap = useMemo(() => {
    const q = query.trim().toLowerCase();
    const m = new Map<string, boolean>();
    for (const n of raw.nodes) {
      const card = cards.find((c) => c.id === n.id);
      let ok = true;
      if (q && card) {
        const inName = card.name.toLowerCase().includes(q);
        const inValues = Object.values(card.values).some((v) =>
          typeof v === "string" ? v.toLowerCase().includes(q) : false,
        );
        ok = inName || inValues;
      }
      if (typeFilter && card && card.type_id !== typeFilter) ok = false;
      m.set(n.id, ok);
    }
    return m;
  }, [raw.nodes, query, typeFilter, cards]);

  const visibleNodes: Node[] = useMemo(() => {
    const q = query.trim();
    const hasFilter = Boolean(q || typeFilter);
    return raw.nodes.map((n) => {
      const cardType = cardTypes.find((t) => t.id === n.data.typeId);
      const color = cardType?.color ?? "#888888";
      const matched = matchMap.get(n.id) ?? true;
      const dim = hasFilter && !matched;
      return {
        id: n.id,
        position: n.position,
        data: { label: n.data.label },
        style: {
          padding: 8,
          borderRadius: 4,
          border: `2px solid ${color}`,
          background: dim ? "var(--bg-surface)" : `${color}22`,
          fontSize: 12,
          whiteSpace: "pre-line" as const,
          textAlign: "center" as const,
          width: 140,
          color: dim ? "var(--fg-muted)" : "var(--fg-primary)",
          opacity: dim ? 0.35 : 1,
          transition: "opacity 0.15s",
        },
      };
    });
  }, [raw.nodes, cardTypes, matchMap, query, typeFilter]);

  const visibleEdges: Edge[] = useMemo(() => {
    return raw.edges.map((e) => {
      const kind = relationKinds.find((k) => k.id === e.kind);
      const color = kind?.color ?? "#999999";
      const fromMatch = matchMap.get(e.source) ?? true;
      const toMatch = matchMap.get(e.target) ?? true;

      let hide = false;
      if (kindFilter && e.kind !== kindFilter) hide = true;
      if (typeFilter && !(fromMatch && toMatch)) hide = true;
      if (query.trim() && !(fromMatch || toMatch)) hide = true;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        hidden: hide,
        style: { stroke: color },
        labelStyle: { fontSize: 10, fill: color },
        labelBgStyle: { fill: "var(--bg-panel)" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
      };
    });
  }, [raw.edges, relationKinds, matchMap, kindFilter, typeFilter, query]);

  function onNodesChange(changes: NodeChange<Node>[]) {
    // 位置变动本地保留，不持久化（图谱布局每次重算）
    void changes;
  }

  const hasFilter = Boolean(query.trim() || typeFilter || kindFilter);

  function reset() {
    setQuery("");
    setTypeFilter("");
    setKindFilter("");
  }

  if (cards.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 13,
        }}
      >
        还没有卡牌，先去「世界观 · 卡片」创建。
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      <Toolbar>
        <input
          className="input"
          placeholder="搜索节点"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 180 }}
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
        <select
          className="select"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          style={{ width: 130 }}
        >
          <option value="">全部关系</option>
          {relationKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button className="btn" onClick={reset}>
            重置
          </button>
        )}

        <ToolbarSpacer />

        <span
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {raw.nodes.length} 节点 · {raw.edges.length} 边
        </span>
      </Toolbar>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => selectCard(node.id)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border-subtle)" gap={20} />
          <Controls
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          />
          <MiniMap
            pannable
            zoomable
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
            maskColor="rgba(0,0,0,0.5)"
            nodeColor={() => "var(--bg-raised)"}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
