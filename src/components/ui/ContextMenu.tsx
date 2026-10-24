import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";

export type MenuEntry =
  | {
      type?: "item";
      label: string;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
      shortcut?: string;
    }
  | { type: "divider" }
  | { type: "submenu"; label: string; items: MenuEntry[] };

interface MenuState {
  x: number;
  y: number;
  items: MenuEntry[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuEntry[];
  onClose: () => void;
}

function rowStyle(
  hover: boolean,
  danger: boolean,
  disabled?: boolean,
): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    padding: "6px 10px",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: danger
      ? "transparent"
      : hover
        ? "var(--bg-raised)"
        : "transparent",
    color: danger ? "var(--danger)" : "var(--fg-primary)",
    cursor: disabled ? "default" : "pointer",
    fontSize: 13,
    fontFamily: "inherit",
    opacity: disabled ? 0.45 : 1,
    appearance: "none",
  };
}

function MenuRow({ entry, onClose }: { entry: MenuEntry; onClose: () => void }) {
  const [hover, setHover] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  if (entry.type === "divider") {
    return (
      <div
        style={{
          height: 1,
          background: "var(--border-subtle)",
          margin: "4px 6px",
        }}
      />
    );
  }

  if (entry.type === "submenu") {
    return (
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => {
          setHover(true);
          setSubOpen(true);
        }}
        onMouseLeave={() => {
          setHover(false);
          setSubOpen(false);
        }}
      >
        <div style={rowStyle(hover, false)}>
          <span>{entry.label}</span>
          <span style={{ marginLeft: "auto", color: "var(--fg-muted)" }}>▶</span>
        </div>
        {subOpen && (
          <div
            style={{
              position: "absolute",
              left: "100%",
              top: -4,
              marginLeft: 4,
              minWidth: 160,
              background: "var(--bg-panel)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              padding: 4,
              zIndex: 1,
            }}
          >
            {entry.items.map((sub, i) => (
              <MenuRow key={i} entry={sub} onClose={onClose} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const disabled = entry.disabled;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        entry.onClick();
        onClose();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={rowStyle(hover, !!entry.danger, disabled)}
    >
      <span>{entry.label}</span>
      {entry.shortcut && (
        <span
          style={{
            marginLeft: "auto",
            color: "var(--fg-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {entry.shortcut}
        </span>
      )}
    </button>
  );
}

function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x, y });

  // 贴边时往回弹，避免溢出视口
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    let nx = x;
    let ny = y;
    if (x + width + pad > window.innerWidth) {
      nx = Math.max(pad, window.innerWidth - width - pad);
    }
    if (y + height + pad > window.innerHeight) {
      ny = Math.max(pad, window.innerHeight - height - pad);
    }
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onScroll() {
      onClose();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", onScroll);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 2000,
        minWidth: 184,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        padding: 4,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        fontSize: 13,
        color: "var(--fg-primary)",
      }}
    >
      {items.map((it, i) => (
        <MenuRow key={i} entry={it} onClose={onClose} />
      ))}
    </div>,
    document.body,
  );
}

/**
 * 右键菜单的轻量封装：在调用处 `const ctx = useContextMenu()`，
 * 给目标元素挂 `onContextMenu={(e) => ctx.open(e, items)}`，
 * 并在组件末尾渲染 `{ctx.node}`。菜单自动定位到鼠标、点击空白/Esc/滚动关闭。
 */
export function useContextMenu() {
  const [state, setState] = useState<MenuState | null>(null);

  const open = useCallback((e: ReactMouseEvent, items: MenuEntry[]) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ x: e.clientX, y: e.clientY, items });
  }, []);

  const close = useCallback(() => setState(null), []);

  const node = state ? (
    <ContextMenu x={state.x} y={state.y} items={state.items} onClose={close} />
  ) : null;

  return { open, close, node };
}
