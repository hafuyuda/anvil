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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width,
        transition: reducedMotion ? "none" : "width 150ms ease",
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontSize: 13,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {!collapsed && <SectionLabel>模块</SectionLabel>}

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
          <SectionLabel>概览</SectionLabel>
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : 1,
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: 8,
    width: "100%",
    padding: collapsed ? "6px 0" : "6px 10px",
    border: "none",
    borderLeft: active
      ? "2px solid var(--accent-gold)"
      : "2px solid transparent",
    borderRadius: 0,
    background: active ? "var(--bg-raised)" : "transparent",
    color: disabled
      ? "var(--fg-muted)"
      : active
        ? "var(--fg-primary)"
        : "var(--fg-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? 600 : 400,
    fontSize: 13,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    overflow: "hidden",
  };

  const title = meta.shortcut ? `${meta.label} · ${meta.shortcut}` : meta.label;

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        padding: "8px 8px 4px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "2px 10px",
        color: "var(--fg-secondary)",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      <span
        style={{ color: "var(--fg-primary)", fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
    </div>
  );
}
