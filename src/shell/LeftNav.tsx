import { useState, useSyncExternalStore } from "react";
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
import { SectionLabel } from "../components/ui";
import { useProjectStore, type ModuleKey } from "../stores/projectStore";
import {
  getModuleOrder,
  setModuleOrder,
  subscribeModuleOrder,
} from "../lib/moduleOrder";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface ModuleMeta {
  label: string;
  glyph: string;
  shortcut?: string;
}

const MODULE_META: Record<ModuleKey, ModuleMeta> = {
  world: { label: "世界观", glyph: "◈", shortcut: "Ctrl+1" },
  docs: { label: "文档", glyph: "✎" },
  story: { label: "视觉小说", glyph: "❖", shortcut: "Ctrl+2" },
  board: { label: "棋盘", glyph: "▦", shortcut: "Ctrl+3" },
  cardGroups: { label: "卡组", glyph: "▤" },
  session: { label: "跑团", glyph: "✦", shortcut: "Ctrl+4" },
  player: { label: "音乐", glyph: "♪" },
  types: { label: "类型", glyph: "◇", shortcut: "Ctrl+5" },
};

const WIDE = 180;
const NARROW = 48;

export function LeftNav() {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  // 侧栏宽度动画改动的是 width，属于会触发重排的属性；
  // 用户要求减少动效时直接跳变，不做逐帧插值。
  const reducedMotion = useReducedMotion();

  const order = useSyncExternalStore(
    subscribeModuleOrder,
    getModuleOrder,
    getModuleOrder,
  );

  const projectPath = useProjectStore((s) => s.projectPath);
  const activeModule = useProjectStore((s) => s.activeModule);
  const setActiveModule = useProjectStore((s) => s.setActiveModule);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];

  const isCardWall = activeModule === "world";
  const collapsed = !isCardWall && !hovered && !dragging;
  const width = collapsed ? NARROW : WIDE;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.indexOf(active.id as ModuleKey);
    const newIdx = order.indexOf(over.id as ModuleKey);
    if (oldIdx < 0 || newIdx < 0) return;
    setModuleOrder(arrayMove(order, oldIdx, newIdx));
  }

  return (
    <div
      className="nav"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width,
        transition: reducedMotion ? "none" : "width 150ms ease",
      }}
    >
      {!collapsed && (
        <SectionLabel
          variant="block"
          style={{ paddingLeft: "var(--sp-5)", marginTop: "var(--sp-4)" }}
        >
          模块
        </SectionLabel>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragging(false)}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((key) => (
            <SortableNavItem
              key={key}
              moduleKey={key}
              active={activeModule === key}
              disabled={!projectPath}
              collapsed={collapsed}
              onClick={() => setActiveModule(key)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div style={{ flex: 1 }} />

      {!collapsed && (
        <>
          <SectionLabel
            variant="block"
            style={{ paddingLeft: "var(--sp-5)" }}
          >
            概览
          </SectionLabel>
          <Stat label="卡牌" value={cards.length} />
          <Stat label="关系" value={relations.length} />
          <Stat label="类型" value={cardTypes.length} />
        </>
      )}
    </div>
  );
}

function SortableNavItem({
  moduleKey,
  active,
  disabled,
  collapsed,
  onClick,
}: {
  moduleKey: ModuleKey;
  active: boolean;
  disabled: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: moduleKey, disabled });

  const meta = MODULE_META[moduleKey];

  // 只有 dnd 的实时状态留在内联里，观感全部交给 .nav-item（index.css）
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const cls = ["nav-item", active && "is-active", collapsed && "is-collapsed"]
    .filter(Boolean)
    .join(" ");

  const title = meta.shortcut ? `${meta.label} · ${meta.shortcut}` : meta.label;

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
    >
      <span style={{ color: "var(--accent-gold)", flexShrink: 0 }}>
        {meta.glyph}
      </span>
      {!collapsed && <span>{meta.label}</span>}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="nav-stat">
      <span>{label}</span>
      <span
        style={{ color: "var(--fg-primary)", fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}
