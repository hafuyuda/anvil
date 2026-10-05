import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { Card, Relation } from "../../core/ipc";

interface ForceNode extends SimulationNodeDatum {
  id: string;
  label: string;
  typeId: string;
  isolated: boolean;
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
  const cardIds = new Set(cards.map((c) => c.id));

  const validRelations = relations.filter(
    (r) => cardIds.has(r.from) && cardIds.has(r.to),
  );

  // 计算度数：判断孤立节点
  const degree = new Map<string, number>();
  for (const c of cards) degree.set(c.id, 0);
  for (const r of validRelations) {
    degree.set(r.from, (degree.get(r.from) ?? 0) + 1);
    degree.set(r.to, (degree.get(r.to) ?? 0) + 1);
  }

  const nodes: ForceNode[] = cards.map((c) => ({
    id: c.id,
    label: c.name,
    typeId: c.type_id,
    isolated: (degree.get(c.id) ?? 0) === 0,
  }));

  const links: ForceLink[] = validRelations.map((r) => ({
    id: r.id,
    source: r.from,
    target: r.to,
    label: relationKindName(r.kind),
    kind: r.kind,
  }));

  const isolatedCount = nodes.filter((n) => n.isolated).length;

  // 主布局力模拟
  const sim = forceSimulation<ForceNode>(nodes)
    .force(
      "link",
      forceLink<ForceNode, ForceLink>(links)
        .id((d) => d.id)
        .distance(220)
        .strength(0.5),
    )
    .force("charge", forceManyBody().strength(-600))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide(150))
    .force(
      "x",
      forceX(0).strength((d) => ((d as ForceNode).isolated ? 0.12 : 0.02)),
    )
    .force(
      "y",
      forceY(0).strength((d) => ((d as ForceNode).isolated ? 0.12 : 0.02)),
    )
    .stop();

  // 收敛迭代。节点越多，需要的迭代越多
  const ticks = Math.min(600, 200 + nodes.length * 3);
  for (let i = 0; i < ticks; i++) sim.tick();

  // 如果孤立节点太多，把它们排到右侧一个网格，避免和主图重叠
  if (isolatedCount > 8) {
    layoutIsolatedGrid(nodes);
  }

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

/**
 * 孤立节点太多时，把它们排成网格放在主图右侧。
 * 主图本身不重新布局，只是把孤立节点搬走。
 */
function layoutIsolatedGrid(nodes: ForceNode[]) {
  const isolated = nodes.filter((n) => n.isolated);
  const connected = nodes.filter((n) => !n.isolated);

  // 计算主图包围盒
  let minX = 0;
  let maxX = 0;
  for (const n of connected) {
    const x = n.x ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }

  const gridStartX = maxX + 260;
  const cellW = 180;
  const cellH = 130;
  const cols = Math.max(1, Math.ceil(Math.sqrt(isolated.length)));

  isolated.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    n.x = gridStartX + col * cellW;
    n.y = -((isolated.length / cols) * cellH) / 2 + row * cellH;
  });
}
