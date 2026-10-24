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
  sortableKeyboardCoordinates,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import type { AggregateEntry } from "../aggregate";
import { aggregate, reorderByUnique } from "../aggregate";

/**
 * 卡组视图共用的排序容器。
 *
 * grid / list 两个视图只有 strategy 与行渲染不同，其余（传感器、
 * 拖拽结束的重排算法、×N 聚合）完全一致 —— 一致的部分收在这里，
 * 视图文件只留「行长什么样」。加第三个视图或修拖拽 bug 都只有一处。
 *
 * children 收聚合后的 entries：外层容器（CardGrid / ul）由视图自定，
 * 两种视图的容器元素与样式不同，硬收进来反而要开一排分支。
 */
export function SortableCards({
  cardIds,
  onReorder,
  strategy,
  children,
}: {
  cardIds: string[];
  onReorder: (next: string[]) => void;
  strategy: SortingStrategy;
  children: (entries: AggregateEntry[]) => React.ReactNode;
}) {
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
    // 唯一序重排，每张卡的份数原样保留（×N 不因拖拽丢失）
    onReorder(reorderByUnique(cardIds, arrayMove(uniqueIds, oldIdx, newIdx)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={uniqueIds} strategy={strategy}>
        {children(entries)}
      </SortableContext>
    </DndContext>
  );
}
