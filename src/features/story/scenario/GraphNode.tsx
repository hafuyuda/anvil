import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useProjectStore } from "../../../stores/projectStore";
import { CardFrame } from "../../../components/CardFrame";

interface GraphNodeData {
  dim?: boolean;
  [key: string]: unknown;
}

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "var(--bg-surface)",
  border: "2px solid var(--border-strong)",
  borderRadius: "50%",
  transition: "background 0.12s, border-color 0.12s, transform 0.12s",
};

export function GraphNode({ id, data }: NodeProps) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const selectedCardId = useProjectStore((s) => s.selectedCardId);

  const card = cards.find((c) => c.id === id);
  if (!card) return null;

  const cardType = cardTypes.find((t) => t.id === card.type_id);
  if (!cardType) return null;

  const dim = Boolean((data as GraphNodeData).dim);
  const selected = selectedCardId === id;

  return (
    <div
      style={{
        opacity: dim ? 0.3 : 1,
        transition: "opacity 0.15s",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...handleStyle, top: -5 }}
        className="graph-handle"
      />
      <CardFrame
        card={card}
        cardType={cardType}
        size="small"
        selected={selected}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...handleStyle, bottom: -5 }}
        className="graph-handle"
      />
    </div>
  );
}
