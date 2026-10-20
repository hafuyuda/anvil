import { useEffect, useRef, useState } from "react";
import { ipc, type ScriptHit } from "../../../../core/ipc";
import { runWithError } from "../../../../lib/runWithError";
import { SnippetText } from "./primitives";

interface Props {
  scenarioId: string;
  onOpenHit: (hit: ScriptHit) => void;
}

/**
 * 剧本内搜索。防抖 300ms，最少 3 字。
 * 点外面关掉下拉 —— 用 mousedown 而不是 click，
 * 这样按下拖动到外面再松手也算「外面」。
 */
export function ScriptSearchBox({ scenarioId, onOpenHit }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ScriptHit[] | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 3) {
      setHits(null);
      return;
    }
    const h = setTimeout(async () => {
      const r = await runWithError(
        () => ipc.searchScenarioScripts(scenarioId, text, 30),
        "搜索失败",
      );
      if (!r.ok) return;
      setHits(r.value);
    }, 300);
    return () => clearTimeout(h);
  }, [q, scenarioId]);

  useEffect(() => {
    if (hits === null) return;
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setHits(null);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [hits]);

  return (
    <div ref={searchRef} style={{ position: "relative", flexShrink: 0 }}>
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索剧本（≥3 字）"
        style={{ width: 170, fontSize: 12, padding: "4px 8px" }}
      />
      {hits !== null && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: 320,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--bg-panel)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100,
          }}
        >
          {hits.length === 0 && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              无匹配结果
            </div>
          )}
          {hits.map((h) => (
            <button
              key={`${h.filename}:${h.line}`}
              onClick={() => {
                // 跳走就把下拉收掉，否则它盖在编辑器上面。
                // 清 query 是为了和原来一致 —— 顺带也让 [q] 效应把 hits 清空
                setQ("");
                onOpenHit(h);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-raised)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                }}
              >
                {h.filename} : {h.line + 1}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--fg-secondary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <SnippetText snippet={h.snippet} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
