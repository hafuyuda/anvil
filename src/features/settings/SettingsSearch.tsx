import { useEffect, useMemo, useRef, useState } from "react";
import { listCategories } from "./categories/registry";

interface Props {
  onNavigate: (c: string) => void;
}

export function SettingsSearch({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return listCategories().filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [results.length]);

  function pick(c: string) {
    onNavigate(c);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        e.stopPropagation();
        setQuery("");
        setOpen(false);
      }
      // 无 query 时放行，让上层关闭设置
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const r = results[activeIdx];
      if (r) pick(r.id);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>◇</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="搜索设置…"
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--fg-primary)",
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
      </div>

      {open && query && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            padding: 4,
            zIndex: 10,
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: "6px 10px",
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              无匹配
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r.id)}
                onMouseEnter={() => setActiveIdx(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  background:
                    i === activeIdx ? "var(--bg-raised)" : "transparent",
                  color:
                    i === activeIdx
                      ? "var(--accent-gold)"
                      : "var(--fg-primary)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              >
                <span style={{ color: "var(--accent-gold)", fontSize: 12 }}>
                  {r.glyph}
                </span>
                {r.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
