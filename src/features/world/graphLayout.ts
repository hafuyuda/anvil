import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { Card, Relation } from "../../core/ipc";

interface ForceNode extends SimulationNodeDatum {
  id: string;
  label: string;
  typeId: string;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  id: string;
  label: string;
  kind: string;
}

export interface GraphNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; typeId: string };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  kind: string;
}

export function buildGraph(
  cards: Card[],
  relations: Relation[],
  cardTypeName: (typeId: string) => string,
  relationKindName: (kindId: string) => string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: ForceNode[] = cards.map((c) => ({
    id: c.id,
    label: c.name,
    typeId: c.type_id,
  }));

  const cardIds = new Set(cards.map((c) => c.id));
  const links: ForceLink[] = relations
    .filter((r) => cardIds.has(r.from) && cardIds.has(r.to))
    .map((r) => ({
      id: r.id,
      source: r.from,
      target: r.to,
      label: relationKindName(r.kind),
      kind: r.kind,
    }));

  const sim = forceSimulation<ForceNode>(nodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(links)
        .id((d) => d.id)
        .distance(150)
        .strength(0.6),
    )
    .force("charge", forceManyBody().strength(-450))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide(80))
    .stop();

  // 同步跑 300 tick，让布局收敛
  for (let i = 0; i < 300; i++) sim.tick();

  const graphNodes: GraphNode[] = nodes.map((n) => ({
    id: n.id,
    position: { x: n.x ?? 0, y: n.y ?? 0 },
    data: {
      label: `${n.label}\n(${cardTypeName(n.typeId)})`,
      typeId: n.typeId,
    },
  }));

  const graphEdges: GraphEdge[] = links.map((l) => {
    const source =
      typeof l.source === "object" && l.source !== null
        ? l.source.id
        : String(l.source);
    const target =
      typeof l.target === "object" && l.target !== null
        ? l.target.id
        : String(l.target);
    return {
      id: l.id,
      source,
      target,
      label: l.label,
      kind: l.kind,
    };
  });
  return { nodes: graphNodes, edges: graphEdges };
}
