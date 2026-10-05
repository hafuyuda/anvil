import { useEffect, useMemo, useState } from "react";
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
import { GraphNode } from "./GraphNode";
import { Toolbar, ToolbarSpacer } from "../../components/Toolbar";
import { type Connection } from "@xyflow/react";
import { GraphEdgeDialog } from "./GraphEdgeDialog";

export function GraphView() {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const selectCard = useProjectStore((s) => s.selectCard);
  const selectEdge = useProjectStore((s) => s.selectEdge);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const [pendingConnection, setPendingConnection] = useState<{
    fromId: string;
    toId: string;
  } | null>(null);

  function onConnect(conn: Connection) {
    if (!conn.source || !conn.target) return;
    if (conn.source === conn.target) return;
    setPendingConnection({ fromId: conn.source, toId: conn.target });
  }

  const dataKey = useMemo(() => {
    const cardIds = cards
      .map((c) => c.id)
      .sort()
      .join(",");
    const worldRelations = relations.filter((r) => !r.meta?.scenario_id);
    const relIds = worldRelations
      .map((r) => r.id)
      .sort()
      .join(",");
    return `${cardIds}|${relIds}`;
  }, [cards, relations]);

  useEffect(() => {
    const worldRelations = relations.filter((r) => !r.meta?.scenario_id);
    const raw = buildGraph(
      cards,
      worldRelations,
      (typeId) =>
        cardTypes.find((t) => t.id === typeId)?.name ?? typeId.slice(0, 8),
      (kindId) => relationKinds.find((k) => k.id === kindId)?.name ?? kindId,
    );
    setNodes(
      raw.nodes.map((n) => ({
        id: n.id,
        type: "card",
        position: n.position,
        data: { dim: false },
      })),
    );
    setEdges(
      raw.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  // 计算变暗状态，更新节点 data
  const styledNodes: Node[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hasFilter = Boolean(q || typeFilter);
    return nodes.map((n) => {
      const card = cards.find((c) => c.id === n.id);
      let matched = true;
      if (q && card) {
        const inName = card.name.toLowerCase().includes(q);
        const inValues = Object.values(card.values).some((v) =>
          typeof v === "string" ? v.toLowerCase().includes(q) : false,
        );
        matched = inName || inValues;
      }
      if (typeFilter && card && card.type_id !== typeFilter) matched = false;
      const dim = hasFilter && !matched;
      return {
        ...n,
        data: { ...(n.data as object), dim },
      };
    });
  }, [nodes, query, typeFilter, cards]);

  const visibleEdges: Edge[] = useMemo(() => {
    const matchMap = new Map<string, boolean>();
    const q = query.trim().toLowerCase();
    for (const n of nodes) {
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
      matchMap.set(n.id, ok);
    }

    return edges.map((e) => {
      const raw = relations.find((r) => r.id === e.id);
      const kind = raw
        ? relationKinds.find((k) => k.id === raw.kind)
        : undefined;
      const color = kind?.color ?? "#999999";
      const fromMatch = matchMap.get(e.source) ?? true;
      const toMatch = matchMap.get(e.target) ?? true;

      let hide = false;
      if (kindFilter && raw && raw.kind !== kindFilter) hide = true;
      if (typeFilter && !(fromMatch && toMatch)) hide = true;
      if (q && !(fromMatch || toMatch)) hide = true;

      return {
        ...e,
        hidden: hide,
        style: { stroke: color },
        labelStyle: { fontSize: 10, fill: color },
        labelBgStyle: { fill: "var(--bg-panel)" },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 2,
      };
    });
  }, [
    edges,
    relations,
    relationKinds,
    nodes,
    cards,
    query,
    typeFilter,
    kindFilter,
  ]);

  function onNodesChange(changes: NodeChange<Node>[]) {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }

  const nodeTypes = useMemo(() => ({ card: GraphNode }), []);

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
          {nodes.length} 节点 · {edges.length} 边
        </span>
      </Toolbar>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <ReactFlow
          nodes={styledNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => selectCard(node.id)}
          onEdgeClick={(_, edge) => selectEdge(edge.id)}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.2 }}
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

      {pendingConnection &&
        (() => {
          const fromCard = cards.find((c) => c.id === pendingConnection.fromId);
          const toCard = cards.find((c) => c.id === pendingConnection.toId);
          if (!fromCard || !toCard) return null;
          return (
            <GraphEdgeDialog
              from={fromCard}
              to={toCard}
              onClose={() => setPendingConnection(null)}
            />
          );
        })()}
    </div>
  );
}
