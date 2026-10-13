import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, CardType } from "../../../../core/ipc";
import type { CardGroupViewDef, CardGroupViewProps } from "../types";

function ListView({
  cardIds,
  cardById,
  typeById,
  onReorder,
  onRemove,
}: CardGroupViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cardIds.indexOf(active.id as string);
    const newIdx = cardIds.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(cardIds, oldIdx, newIdx));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            overflow: "hidden",
          }}
        >
          {cardIds.map((id, i) => {
            const card = cardById.get(id);
            const type = card ? typeById.get(card.type_id) : null;
            return (
              <SortableListRow
                key={id}
                id={id}
                index={i}
                isLast={i === cardIds.length - 1}
                card={card ?? null}
                type={type ?? null}
                onRemove={onRemove}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableListRow({
  id,
  index,
  isLast,
  card,
  type,
  onRemove,
}: {
  id: string;
  index: number;
  isLast: boolean;
  card: Card | null;
  type: CardType | null;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
    fontSize: 12,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "var(--bg-raised)" : undefined,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
  };

  return (
    <li ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        title="拖动排序"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          color: "var(--fg-muted)",
          userSelect: "none",
          fontSize: 13,
          letterSpacing: -2,
          touchAction: "none",
          flexShrink: 0,
          padding: "2px 0",
        }}
      >
        ⋮⋮
      </div>
      <span
        style={{
          color: "var(--fg-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          minWidth: 24,
          textAlign: "right",
        }}
      >
        {index + 1}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          color: card ? "var(--fg-primary)" : "var(--fg-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={card?.name ?? id}
      >
        {card?.name ?? `（已删除 ${id.slice(0, 8)}）`}
      </span>
      {type && (
        <span style={{ color: "var(--fg-muted)", fontSize: 11, flexShrink: 0 }}>
          {type.name}
        </span>
      )}
      <button
        className="btn btn-ghost"
        onClick={() => onRemove(id)}
        title="移除"
        style={{
          fontSize: 12,
          padding: "1px 6px",
          color: "var(--danger)",
        }}
      >
        ×
      </button>
    </li>
  );
}

const def: CardGroupViewDef = {
  id: "list",
  label: "列表视图",
  icon: "☰",
  order: 20,
  Component: ListView,
};

export default def;
