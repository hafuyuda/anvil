import { useEffect, useMemo, useState } from "react";
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
import { GraphNode } from "../world/GraphNode";
import { newId } from "../../lib/id";
import { nowMs } from "../../lib/time";

interface Props {
  scenario: Scenario;
}

export function StoryGraphView({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const relationKinds = useProjectStore((s) => s.relationKinds) ?? [];
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const upsertRelation = useProjectStore((s) => s.upsertRelation);
  const removeRelation = useProjectStore((s) => s.removeRelation);
  const selectCard = useProjectStore((s) => s.selectCard);
  const selectEdge = useProjectStore((s) => s.selectEdge);

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
        r.meta?.scenario_id === scenario.id &&
        (kindSet === null || kindSet.has(r.kind)),
    );
  }, [relations, scenario.node_ids, scenario.edge_kinds, scenario.id]);

  const initialNodes: Node[] = useMemo(() => {
    const radius = Math.max(280, scenarioNodes.length * 40);
    return scenarioNodes.map((c, i) => {
      const stored = scenario.node_positions[c.id];
      const angle = (2 * Math.PI * i) / Math.max(1, scenarioNodes.length);
      const pos = stored
        ? { x: stored[0], y: stored[1] }
        : {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
          };
      return {
        id: c.id,
        type: "card",
        position: pos,
        data: { dim: false },
      };
    });
  }, [scenarioNodes, scenario.node_positions]);

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
        labelBgStyle: { fill: "var(--bg-panel)" },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 3,
      };
    });
  }, [scenarioEdges, relationKinds]);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [lastScenarioId, setLastScenarioId] = useState(scenario.id);

  if (lastScenarioId !== scenario.id) {
    setLastScenarioId(scenario.id);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

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
    const next = { ...scenario, node_positions: map, updated_at: nowMs() };
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
    const now = nowMs();
    const relation: Relation = {
      id: newId(),
      from: conn.source,
      to: conn.target,
      kind,
      label: null,
      meta: {
        condition: "",
        scenario_id: scenario.id,
      },
      created_at: now,
    };
    await ipc.upsertRelation(relation);
    upsertRelation(relation);
  }

  function onEdgeClick(_: unknown, edge: Edge) {
    selectEdge(edge.id);
  }

  async function onEdgesDelete(deleted: Edge[]) {
    for (const e of deleted) {
      const relation = relations.find((r) => r.id === e.id);
      if (!relation) continue;
      await ipc.deleteRelation(relation.from, relation.id);
      removeRelation(relation.id);
    }
  }

  const nodeTypes = useMemo(() => ({ card: GraphNode }), []);

  if (scenario.node_ids.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 13,
          textAlign: "center",
          padding: 24,
          lineHeight: 1.8,
        }}
      >
        还没有节点。去「设置」里勾选要放进剧情的卡牌。
        <br />
        剧情图只显示在本剧情中创建的关系。
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
        background: "var(--bg-app)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => selectCard(node.id)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
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
  );
}
