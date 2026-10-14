import { useMemo } from "react";
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
import { CardGrid, GridCard } from "../../../../components/card/CardGrid";
import type { CardGroupViewDef, CardGroupViewProps } from "../types";
import { aggregate, reorderByUnique } from "../../aggregate";

function GridView({
  cardIds,
  cardById,
  typeById,
  onReorder,
  onRemoveOne,
}: CardGroupViewProps) {
  const entries = useMemo(() => aggregate(cardIds), [cardIds]);
  const uniqueIds = useMemo(() => entries.map((e) => e.cardId), [entries]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = uniqueIds.indexOf(active.id as string);
    const newIdx = uniqueIds.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(reorderByUnique(cardIds, arrayMove(uniqueIds, oldIdx, newIdx)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={uniqueIds} strategy={rectSortingStrategy}>
        <CardGrid>
          {entries.map((e) => {
            const card = cardById.get(e.cardId) ?? null;
            const type = card ? (typeById.get(card.type_id) ?? null) : null;
            return (
              <SortableGridCard
                key={e.cardId}
                id={e.cardId}
                count={e.count}
                card={card}
                type={type}
                onRemoveOne={onRemoveOne}
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
  count,
  card,
  type,
  onRemoveOne,
}: {
  id: string;
  count: number;
  card: Card | null;
  type: CardType | null;
  onRemoveOne: (id: string) => void;
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            pointerEvents: "none",
          }}
        >
          {count > 1 && (
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(0,0,0,0.7)",
                border: "1px solid var(--accent-gold)",
                color: "var(--accent-gold)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
              }}
            >
              × {count}
            </span>
          )}
          <button
            className="btn btn-icon"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveOne(id);
            }}
            title="移除一份"
            style={{
              padding: "2px 6px",
              fontSize: 12,
              pointerEvents: "auto",
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
            }}
          >
            ×
          </button>
        </div>
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
