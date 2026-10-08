import { useEffect, useMemo, useState } from "react";
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
import { parseScript } from "./parser";
import { serializeScript } from "./serializer";
import { ScriptSceneSettings } from "./ScriptSceneSettings";
import { ScriptLineCard } from "./ScriptLineCard";
import type { ScriptFrontmatter, ScriptLine } from "./types";

interface Props {
  content: string;
  onChange: (c: string) => void;
}

export function ScriptStructuredEditor({ content, onChange }: Props) {
  const parsed = useMemo(() => parseScript(content), [content]);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  useEffect(() => {
    if (focusIdx === null) return;
    const t = setTimeout(() => setFocusIdx(null), 80);
    return () => clearTimeout(t);
  }, [focusIdx]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function updateFrontmatter(patch: Partial<ScriptFrontmatter>) {
    const fm: ScriptFrontmatter = { ...parsed.frontmatter, ...patch };
    for (const k of Object.keys(fm) as (keyof ScriptFrontmatter)[]) {
      if (fm[k] === undefined || fm[k] === null) delete fm[k];
    }
    onChange(serializeScript({ frontmatter: fm, lines: parsed.lines }));
  }

  function updateLines(lines: ScriptLine[]) {
    onChange(serializeScript({ frontmatter: parsed.frontmatter, lines }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(active.id);
    const newIdx = Number(over.id);
    if (Number.isNaN(oldIdx) || Number.isNaN(newIdx)) return;
    updateLines(arrayMove(parsed.lines, oldIdx, newIdx));
  }

  function handleLineChange(idx: number, next: ScriptLine) {
    const lines = parsed.lines.map((l, i) => (i === idx ? next : l));
    updateLines(lines);
  }

  function handleDelete(idx: number) {
    updateLines(parsed.lines.filter((_, i) => i !== idx));
  }

  function handleEnter(idx: number) {
    const current = parsed.lines[idx];
    let newLine: ScriptLine;
    if (current.type === "say") {
      newLine = { type: "say", speaker: current.speaker, text: "" };
    } else if (current.type === "bg") {
      newLine = { type: "bg", image: "" };
    } else if (current.type === "sfx") {
      newLine = { type: "sfx", file: "" };
    } else {
      newLine = { type: current.type, text: "" } as ScriptLine;
    }
    const lines = [
      ...parsed.lines.slice(0, idx + 1),
      newLine,
      ...parsed.lines.slice(idx + 1),
    ];
    updateLines(lines);
    setFocusIdx(idx + 1);
  }

  function handleAddAtEnd() {
    const newLine: ScriptLine = { type: "narration", text: "" };
    updateLines([...parsed.lines, newLine]);
    setFocusIdx(parsed.lines.length);
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      <ScriptSceneSettings
        frontmatter={parsed.frontmatter}
        onChange={updateFrontmatter}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {parsed.lines.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
              padding: 24,
            }}
          >
            还没有内容。点下面「+ 添加第一行」开始。
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={parsed.lines.map((_, i) => String(i))}
            strategy={verticalListSortingStrategy}
          >
            {parsed.lines.map((line, i) => (
              <SortableLineRow
                key={i}
                id={String(i)}
                line={line}
                autoFocus={focusIdx === i}
                onChange={(next) => handleLineChange(i, next)}
                onDelete={() => handleDelete(i)}
                onEnter={() => handleEnter(i)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          className="btn btn-ghost"
          onClick={handleAddAtEnd}
          style={{ marginTop: 8, fontSize: 12, alignSelf: "flex-start" }}
        >
          + 添加{parsed.lines.length === 0 ? "第一行" : "行"}
        </button>
      </div>
    </div>
  );
}

function SortableLineRow({
  id,
  line,
  autoFocus,
  onChange,
  onDelete,
  onEnter,
}: {
  id: string;
  line: ScriptLine;
  autoFocus: boolean;
  onChange: (next: ScriptLine) => void;
  onDelete: () => void;
  onEnter: () => void;
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
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ScriptLineCard
        line={line}
        handleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        autoFocus={autoFocus}
        onChange={onChange}
        onDelete={onDelete}
        onEnter={onEnter}
      />
    </div>
  );
}