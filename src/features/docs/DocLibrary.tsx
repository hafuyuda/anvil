import { useCallback, useEffect, useMemo, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { CardDocEditor } from "../cards/card/CardDocEditor";
import { DocFieldSummary } from "../cards/card/DocFieldSummary";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { toast } from "../../lib/toast";

const IMPORT_EXTENSIONS = ["md", "markdown", "txt", "json", "csv", "yaml", "yml"];

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function extensionOf(path: string): string {
  const name = fileName(path);
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : "";
}

/** 代码围栏要长于正文里最长的连续反引号，避免导入内容截断围栏。 */
function fenceFor(text: string): string {
  const runs = text.match(/`+/g) ?? [];
  const longest = runs.reduce((n, r) => Math.max(n, r.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}

/** Markdown / 纯文本原样写入；结构化文本包进代码块，预览时不丢格式。 */
function formatImported(path: string, text: string): string {
  const ext = extensionOf(path);
  const lang =
    ext === "json" || ext === "csv"
      ? ext
      : ext === "yaml" || ext === "yml"
        ? "yaml"
        : null;
  if (!lang) return text;
  const fence = fenceFor(text);
  return `${fence}${lang}\n${text.replace(/\s+$/, "")}\n${fence}\n`;
}

export function DocLibrary() {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  // 只取初值：文档页的选中项与全局选中解耦，避免顺带打开检查器
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    () => useProjectStore.getState().selectedCardId,
  );

  const [docIds, setDocIds] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [onlyWithDocs, setOnlyWithDocs] = useState(true);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ipc
      .listDocIds()
      .then((ids) => {
        if (!cancelled) setDocIds(new Set(ids));
      })
      .catch(() => {
        // 列表加载失败不影响编辑，按“无文档”展示
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeNames = useMemo(
    () => new Map(cardTypes.map((t) => [t.id, t.name])),
    [cardTypes],
  );

  const visibleCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      // 搜索时忽略“只看有文档”，否则没文档的卡永远搜不出来
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .filter((c) => q.length > 0 || !onlyWithDocs || docIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  }, [cards, docIds, onlyWithDocs, query]);

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  const handleSaved = useCallback((cardId: string, content: string) => {
    setDocIds((prev) => {
      const has = prev.has(cardId);
      const next = content.trim().length > 0;
      if (has === next) return prev;
      const copy = new Set(prev);
      if (next) copy.add(cardId);
      else copy.delete(cardId);
      return copy;
    });
  }, []);

  async function handleImport() {
    if (!selectedCard || importing) return;

    const picked = await openDialog({
      multiple: false,
      filters: [{ name: "文本文件", extensions: IMPORT_EXTENSIONS }],
    });
    if (typeof picked !== "string") return;

    setImporting(true);
    try {
      const read = await runWithError(
        () => ipc.readTextFile(picked),
        "读取文件失败",
      );
      if (!read.ok) return;

      const existing = await runWithError(
        () => ipc.loadDoc(selectedCard.id),
        "读取文档失败",
      );
      if (!existing.ok) return;

      if ((existing.value ?? "").trim()) {
        const ok = await confirmDialog({
          title: "导入文本文件",
          message: `「${selectedCard.name}」已有文档，导入会覆盖当前内容。继续？`,
          confirmLabel: "覆盖导入",
          danger: true,
        });
        if (!ok) return;
      }

      const content = formatImported(picked, read.value);
      const saved = await runWithError(
        () => ipc.saveDoc(selectedCard.id, content),
        "导入失败",
      );
      if (!saved.ok) return;

      setDocIds((prev) => new Set(prev).add(selectedCard.id));
      setReloadSeq((n) => n + 1);
      toast.success(`已导入 ${fileName(picked)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <div
        style={{
          width: 240,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: 10,
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索卡牌…"
            style={{ fontSize: 12 }}
          />
          <button
            className="btn btn-ghost"
            onClick={() => setOnlyWithDocs((v) => !v)}
            style={{
              alignSelf: "flex-start",
              fontSize: 11,
              padding: "2px 8px",
              color: onlyWithDocs
                ? "var(--fg-primary)"
                : "var(--fg-secondary)",
            }}
          >
            {onlyWithDocs ? "●" : "○"} 只看有文档（{docIds.size}）
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
          {visibleCards.length === 0 && (
            <div
              style={{
                padding: 12,
                fontSize: 12,
                color: "var(--fg-muted)",
                textAlign: "center",
              }}
            >
              {query.trim()
                ? "没有匹配的卡牌"
                : onlyWithDocs
                  ? "还没有文档，搜索卡牌或取消过滤后开始编写"
                  : "还没有卡牌"}
            </div>
          )}
          {visibleCards.map((card) => {
            const active = card.id === selectedCardId;
            const hasDoc = docIds.has(card.id);
            return (
              <div
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  borderLeft: active
                    ? "2px solid var(--accent-gold)"
                    : "2px solid transparent",
                  background: active ? "var(--bg-raised)" : "transparent",
                  color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: hasDoc ? "var(--accent-gold)" : "var(--border-strong)",
                    flexShrink: 0,
                  }}
                >
                  ●
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {card.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--fg-muted)",
                    flexShrink: 0,
                    maxWidth: 72,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeNames.get(card.type_id) ?? ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-app)",
        }}
      >
        {selectedCard ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-panel)",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedCard.name}
                </div>
                <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>
                  {typeNames.get(selectedCard.type_id) ?? "未知类型"} ·{" "}
                  {docIds.has(selectedCard.id) ? "已有文档" : "空文档"}
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <button
                className="btn"
                onClick={() => void handleImport()}
                disabled={importing}
                style={{ fontSize: 11 }}
                title="从 .md / .txt / .json / .csv / .yaml 导入"
              >
                {importing ? "导入中…" : "导入文本文件"}
              </button>
            </div>

            <div style={{ flexShrink: 0, padding: "0 12px 8px" }}>
              <DocFieldSummary
                card={selectedCard}
                cardType={
                  cardTypes.find((t) => t.id === selectedCard.type_id) ?? null
                }
              />
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                padding: "4px 12px 12px",
              }}
            >
              <CardDocEditor
                key={`${selectedCard.id}:${reloadSeq}`}
                cardId={selectedCard.id}
                onSaved={handleSaved}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            从左侧选择一张卡牌开始编写文档
          </div>
        )}
      </div>
    </div>
  );
}
