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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card, CardType } from "../../../../core/ipc";
import { CardGrid, GridCard } from "../../../../components/CardGrid";
import type { CardGroupViewDef, CardGroupViewProps } from "../types";

function GridView({
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
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <CardGrid>
          {cardIds.map((id) => {
            const card = cardById.get(id) ?? null;
            const type = card ? (typeById.get(card.type_id) ?? null) : null;
            return (
              <SortableGridCard
                key={id}
                id={id}
                card={card}
                type={type}
                onRemove={onRemove}
              />
            );
          })}
        </CardGrid>
      </SortableContext>
    </DndContext>
  );
}

function SortableGridCard({
  id,
  card,
  type,
  onRemove,
}: {
  id: string;
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

  return (
    <GridCard
      card={card}
      cardType={type}
      wrapperRef={setNodeRef}
      wrapperProps={{ ...attributes, ...listeners }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 10 : 1,
        cursor: isDragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
      overlay={
        <button
          className="btn btn-icon"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          title="移除"
          style={{
            padding: "2px 6px",
            fontSize: 12,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
          }}
        >
          ×
        </button>
      }
    />
  );
}

const def: CardGroupViewDef = {
  id: "grid",
  label: "卡片视图",
  icon: "▦",
  order: 10,
  Component: GridView,
};

export default def;
