import { useMemo, useState, useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ipc, type Card, type Relation, type Scenario } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { EdgeEditorDialog } from "./EdgeEditorDialog";

interface Props {
  scenario: Scenario;
}

export function StoryGraphView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards);
  const relations = useProjectStore((s) => s.relations);
  const relationKinds = useProjectStore((s) => s.relationKinds);
  const cardTypes = useProjectStore((s) => s.cardTypes);
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const upsertRelation = useProjectStore((s) => s.upsertRelation);
  const removeRelation = useProjectStore((s) => s.removeRelation);
  const selectCard = useProjectStore((s) => s.selectCard);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

  const scenarioNodes = useMemo(
    () =>
      scenario.node_ids
        .map((id) => cards.find((c) => c.id === id))
        .filter(Boolean) as Card[],
    [scenario.node_ids, cards],
  );

  const scenarioEdges = useMemo(() => {
    const ids = new Set(scenario.node_ids);
    const kindSet = scenario.edge_kinds.length
      ? new Set(scenario.edge_kinds)
      : null;
    return relations.filter(
      (r) =>
        ids.has(r.from) &&
        ids.has(r.to) &&
        (kindSet === null || kindSet.has(r.kind)),
    );
  }, [relations, scenario.node_ids, scenario.edge_kinds]);

  const initialNodes: Node[] = useMemo(() => {
    const radius = Math.max(200, scenarioNodes.length * 30);
    return scenarioNodes.map((c, i) => {
      const stored = scenario.node_positions[c.id];
      const angle = (2 * Math.PI * i) / Math.max(1, scenarioNodes.length);
      const pos = stored
        ? { x: stored[0], y: stored[1] }
        : {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
          };
      const cardType = cardTypes.find((t) => t.id === c.type_id);
      const color = cardType?.color ?? "#888888";
      return {
        id: c.id,
        position: pos,
        data: { label: c.name },
        style: {
          padding: 8,
          borderRadius: 6,
          border: `2px solid ${color}`,
          background: `${color}22`,
          fontSize: 12,
          width: 140,
          textAlign: "center" as const,
          color: "#222",
        },
      };
    });
  }, [scenarioNodes, scenario.node_positions, cardTypes]);

  const initialEdges: Edge[] = useMemo(() => {
    return scenarioEdges.map((r) => {
      const kind = relationKinds.find((k) => k.id === r.kind);
      const color = kind?.color ?? "#999999";
      const condition =
        typeof r.meta?.condition === "string" ? r.meta.condition : "";
      return {
        id: r.id,
        source: r.from,
        target: r.to,
        label: r.label || (condition ? `[${condition}]` : (kind?.name ?? "")),
        data: { condition, kind: r.kind, label: r.label ?? null },
        style: { stroke: color },
        labelStyle: { fontSize: 10, fill: color },
        labelBgStyle: { fill: "#ffffffcc" },
      };
    });
  }, [scenarioEdges, relationKinds]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);
  const [lastScenarioId, setLastScenarioId] = useState(scenario.id);

  if (lastScenarioId !== scenario.id) {
    setLastScenarioId(scenario.id);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }

  function onNodesChange(changes: NodeChange<Node>[]) {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }

  async function onNodeDragStop(_: unknown, __: Node, allNodes: Node[]) {
    const map: Record<string, [number, number]> = {
      ...scenario.node_positions,
    };
    for (const n of allNodes) {
      map[n.id] = [n.position.x, n.position.y];
    }
    const next = { ...scenario, node_positions: map, updated_at: Date.now() };
    await ipc.upsertScenario(next);
    upsertScenario(next);
  }

  async function onConnect(conn: Connection) {
    if (!conn.source || !conn.target) return;
    const kind =
      scenario.edge_kinds.length > 0
        ? scenario.edge_kinds[0]
        : relationKinds[0]?.id;
    if (!kind) {
      alert("请先在剧情设置里选一个允许的关系类型");
      return;
    }
    const now = Date.now();
    const relation: Relation = {
      id: crypto.randomUUID(),
      from: conn.source,
      to: conn.target,
      kind,
      label: null,
      meta: { condition: "" },
      created_at: now,
    };
    await ipc.upsertRelation(relation);
    upsertRelation(relation);
    const kindObj = relationKinds.find((k) => k.id === kind);
    setEdges((es) =>
      addEdge(
        {
          ...conn,
          id: relation.id,
          label: kindObj?.name ?? "",
          data: { condition: "", kind, label: null },
          style: { stroke: kindObj?.color ?? "#999" },
          labelStyle: { fontSize: 10, fill: kindObj?.color ?? "#666" },
          labelBgStyle: { fill: "#ffffffcc" },
        },
        es,
      ),
    );
  }

  function onEdgeClick(_: unknown, edge: Edge) {
    setEditingEdgeId(edge.id);
  }

  async function onEdgesDelete(deleted: Edge[]) {
    for (const e of deleted) {
      const relation = relations.find((r) => r.id === e.id);
      if (!relation) continue;
      await ipc.deleteRelation(relation.from, relation.id);
      removeRelation(relation.id);
    }
    setEdges((es) => es.filter((e) => !deleted.some((d) => d.id === e.id)));
  }

  if (scenario.node_ids.length === 0) {
    return (
      <div style={{ color: "#888", padding: 24 }}>
        还没有节点。去「设置」里勾选要放进剧情的卡牌。
      </div>
    );
  }

  return (
    <div 
    style={{ 
      flex: 1, 
      minHeight: 0, 
      minWidth: 0, 
      position: "relative",
       }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => selectCard(node.id)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      {editingEdgeId &&
        (() => {
          const rel = relations.find((r) => r.id === editingEdgeId);
          if (!rel) return null;
          return (
            <EdgeEditorDialog
              scenario={scenario}
              relation={rel}
              onClose={() => setEditingEdgeId(null)}
            />
          );
        })()}
    </div>
  );
}
