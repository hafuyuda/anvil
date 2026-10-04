import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProjectStore } from "../../stores/projectStore";
import { buildGraph } from "./graphLayout";

export function GraphView() {
  const cards = useProjectStore((s) => s.cards);
  const relations = useProjectStore((s) => s.relations);
  const cardTypes = useProjectStore((s) => s.cardTypes);
  const relationKinds = useProjectStore((s) => s.relationKinds);
  const selectCard = useProjectStore((s) => s.selectCard);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [kindFilter, setKindFilter] = useState<string>("");

  const raw = useMemo(
    () =>
      buildGraph(
        cards,
        relations,
        (typeId) =>
          cardTypes.find((t) => t.id === typeId)?.name ?? typeId.slice(0, 8),
        (kindId) => relationKinds.find((k) => k.id === kindId)?.name ?? kindId
      ),
    [cards, relations, cardTypes, relationKinds]
  );

  // 计算每个节点的匹配状态
  const matchMap = useMemo(() => {
    const q = query.trim().toLowerCase();
    const m = new Map<string, boolean>();
    for (const n of raw.nodes) {
      const card = cards.find((c) => c.id === n.id);
      let ok = true;
      if (q && card) {
        const inName = card.name.toLowerCase().includes(q);
        const inValues = Object.values(card.values).some((v) =>
          typeof v === "string" ? v.toLowerCase().includes(q) : false
        );
        ok = inName || inValues;
      }
      if (typeFilter && card && card.type_id !== typeFilter) ok = false;
      m.set(n.id, ok);
    }
    return m;
  }, [raw.nodes, query, typeFilter, cards]);

  const visibleNodes = useMemo(() => {
    const q = query.trim();
    const hasFilter = Boolean(q || typeFilter);
    return raw.nodes.map((n) => {
      const cardType = cardTypes.find((t) => t.id === n.data.typeId);
      const color = cardType?.color ?? "#888888";
      const matched = matchMap.get(n.id) ?? true;
      const dim = hasFilter && !matched;
      const flowNode: Node = {
        id: n.id,
        position: n.position,
        data: { label: n.data.label },
        style: {
          padding: 8,
          borderRadius: 6,
          border: `2px solid ${color}`,
          background: dim ? "#f5f5f5" : `${color}22`,
          fontSize: 12,
          whiteSpace: "pre-line",
          textAlign: "center",
          width: 140,
          color: dim ? "#aaa" : "#222",
          opacity: dim ? 0.35 : 1,
          transition: "opacity 0.15s",
        },
      };
      return flowNode;
    });
  }, [raw.nodes, cardTypes, matchMap, query, typeFilter]);

  const visibleEdges = useMemo(() => {
    return raw.edges.map((e) => {
      const kind = relationKinds.find((k) => k.id === e.kind);
      const color = kind?.color ?? "#999999";
      const fromMatch = matchMap.get(e.source) ?? true;
      const toMatch = matchMap.get(e.target) ?? true;

      let hide = false;
      if (kindFilter && e.kind !== kindFilter) hide = true;
      if (typeFilter && !(fromMatch && toMatch)) hide = true;
      if (query.trim() && !(fromMatch || toMatch)) hide = true;

      const edge: Edge = {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        hidden: hide,
        style: { stroke: color },
        labelStyle: { fontSize: 10, fill: color },
        labelBgStyle: { fill: "#ffffffcc" },
      };
      return edge;
    });
  }, [raw.edges, relationKinds, matchMap, kindFilter, typeFilter, query]);

  const hasFilter = Boolean(query.trim() || typeFilter || kindFilter);

  function reset() {
    setQuery("");
    setTypeFilter("");
    setKindFilter("");
  }

  if (cards.length === 0) {
    return (
      <div style={{ color: "#888", padding: 24 }}>
        还没有卡牌，先去「世界观 · 卡片」创建。
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #eee",
          background: "#fafafa",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="搜索节点"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 12, width: 180 }}
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
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          style={{ padding: "4px 8px", fontSize: 12 }}
        >
          <option value="">全部关系</option>
          {relationKinds.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button onClick={reset} style={{ fontSize: 12 }}>
            重置
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#999" }}>
          {raw.nodes.length} 节点 · {raw.edges.length} 边
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodeClick={(_, node) => selectCard(node.id)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}