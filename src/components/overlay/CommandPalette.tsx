import { useEffect, useMemo, useRef, useState } from "react";
import { commandRegistry, type Command } from "../../lib/commands";
import { toast } from "../../lib/toast";
import { rankPaletteResults } from "../../features/commands/paletteRanking";

interface Props {
  commands: Command[];
  onClose: () => void;
}

/** 动态结果源的防抖。与卡片墙的搜索一致。 */
const SEARCH_DEBOUNCE_MS = 150;

export function CommandPalette({ commands, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamic, setDynamic] = useState<Command[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  // 源在挂毁时注册一次，这里现取。不能放进 effect 的依赖里 ——
  // listSources() 每次返回新数组，那会让 effect 无限重跑
  const sources = useMemo(() => commandRegistry.listSources(), []);

  // ── 动态结果（卡牌检索等）────────────────────────
  // 防抖 + 竞态保护：旧请求晚回来不算数
  useEffect(() => {
    const q = query.trim();
    if (!q || sources.length === 0) {
      setDynamic([]);
      return;
    }
    let stale = false;
    const h = setTimeout(async () => {
      const out: Command[] = [];
      for (const s of sources) {
        if (q.length < (s.minChars ?? 1)) continue;
        try {
          out.push(...(await s.search(q)));
        } catch {
          // 单个源失败不拖垮其他源
        }
      }
      if (!stale) setDynamic(out);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(h);
    };
  }, [query, sources]);

  const filtered = useMemo(
    () => rankPaletteResults(commands, dynamic, query),
    [commands, dynamic, query],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIndex];
        if (cmd) {
          onClose();
          void Promise.resolve(cmd.run()).catch((err) =>
            toast.error("命令执行失败: " + err),
          );
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, activeIndex, onClose]);

  // 滚动到选中项
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-overlay)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 1100,
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: "60vh",
          background: "var(--bg-panel)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md), 0 0 0 1px rgba(255,255,255,0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <input
          autoFocus
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入命令或搜索卡牌……"
          style={{
            border: "none",
            borderBottom: "1px solid var(--border-subtle)",
            borderRadius: 0,
            padding: "10px 14px",
            fontSize: 14,
            background: "var(--bg-surface)",
          }}
        />

        <div ref={listRef} style={{ overflowY: "auto", padding: "4px 0" }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: 16,
                color: "var(--fg-muted)",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              没有匹配的命令或卡牌
            </div>
          )}

          {filtered.map((cmd, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={cmd.id}
                data-index={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onClose();
                  void Promise.resolve(cmd.run()).catch((err) =>
                    toast.error("命令执行失败: " + err),
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  cursor: "pointer",
                  background: active ? "var(--bg-raised)" : "transparent",
                  borderLeft: active
                    ? "2px solid var(--accent-gold)"
                    : "2px solid transparent",
                }}
              >
                <div className="grow">
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--fg-primary)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {cmd.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                    }}
                  >
                    {cmd.category}
                  </div>
                </div>
                {cmd.shortcut && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {cmd.shortcut}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
