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
import type { FieldDef } from "../../../core/ipc";
import { FieldRow } from "./FieldRow";

interface Props {
  allFields: FieldDef[];
  onUpdate: (realIdx: number, patch: Partial<FieldDef>) => void;
  onRemove: (realIdx: number) => void;
  onReorder: (newFields: FieldDef[]) => void;
}

export function FieldList({ allFields, onUpdate, onRemove, onReorder }: Props) {
  const visibleFields = allFields.filter((f) => !f.deprecated);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return;
    if (oldIndex < 0 || oldIndex >= visibleFields.length) return;
    if (newIndex < 0 || newIndex >= visibleFields.length) return;

    const deprecated = allFields.filter((f) => f.deprecated);
    const reordered = arrayMove(visibleFields, oldIndex, newIndex);
    const merged = [...reordered, ...deprecated].map((f, idx) => ({
      ...f,
      order: idx,
    }));
    onReorder(merged);
  }

  if (visibleFields.length === 0) {
    return <p style={{ color: "var(--fg-muted)", fontSize: 12 }}>还没有字段</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleFields.map((_, idx) => String(idx))}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibleFields.map((field, visibleIdx) => {
            const realIdx = allFields.indexOf(field);
            return (
              <SortableFieldRow
                key={visibleIdx}
                sortableId={String(visibleIdx)}
                field={field}
                onChange={(patch) => onUpdate(realIdx, patch)}
                onRemove={() => onRemove(realIdx)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableFieldRowProps {
  sortableId: string;
  field: FieldDef;
  onChange: (patch: Partial<FieldDef>) => void;
  onRemove: () => void;
}

function SortableFieldRow({
  sortableId,
  field,
  onChange,
  onRemove,
}: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <FieldRow
        field={field}
        handleProps={{ ...attributes, ...listeners }}
        onChange={onChange}
        onRemove={onRemove}
        isDragging={isDragging}
      />
    </div>
  );
}
