import { useEffect, useState } from "react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Card, type Scenario } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { useDraft } from "../../../hooks/useDraft";
import { nowMs } from "../../../lib/time";
import { ScriptEditor } from "../script/ScriptEditor";
import { PlayView } from "../play/PlayView";
import { exportScenarioMarkdown } from "./exportMarkdown";
import { toast } from "../../../lib/toast";
import { runWithError } from "../../../lib/runWithError";

interface Props {
  scenario: Scenario;
}

export function ScenarioEditor({ scenario }: Props) {
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const setCurrentScenario = useProjectStore((s) => s.setCurrentScenario);
  const setCurrentScene = useProjectStore((s) => s.setCurrentScene);

  const { draft, dirty, update, commit } = useDraft(
    scenario,
    async (d): Promise<void | boolean> => {
      if (!d.name.trim()) return false;
      const keys = d.variables.map((v) => v.key);
      const dup = keys.find((k, i) => keys.indexOf(k) !== i);
      if (dup) return false;
      const next: Scenario = { ...d, updated_at: nowMs() };
      await ipc.upsertScenario(next);
      upsertScenario(next);
    },
    {
      undoLabel: "编辑剧情",
      onDraftChange: (d) => {
        upsertScenario({ ...d, updated_at: nowMs() });
      },
    },
  );

  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    scenario.entry_node ?? scenario.node_ids[0] ?? null,
  );
  const [playOpen, setPlayOpen] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  const sceneCards: Card[] = scenario.node_ids
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  const selectedScene = selectedSceneId
    ? (cards.find((c) => c.id === selectedSceneId) ?? null)
    : null;

  // 场景列表变化时，确保当前场景仍有效
  useEffect(() => {
    setSelectedSceneId((prev) => {
      if (prev && scenario.node_ids.includes(prev)) return prev;
      return scenario.entry_node ?? scenario.node_ids[0] ?? null;
    });
  }, [scenario.node_ids, scenario.entry_node]);

  // 通知 store
  useEffect(() => {
    setCurrentScenario(scenario.id);
    return () => setCurrentScenario(null);
  }, [scenario.id, setCurrentScenario]);

  useEffect(() => {
    setCurrentScene(selectedSceneId);
  }, [selectedSceneId, setCurrentScene]);

  // 播放模式 Esc 关闭
  useEffect(() => {
    if (!playOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPlayOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playOpen]);

  async function handleExportMarkdown() {
    if (exportingMd) return;
    setExportingMd(true);
    try {
      await runWithError(async () => {
        const md = await exportScenarioMarkdown({
          scenario: draft,
          cards,
          cardTypes,
          relations,
        });
        const output = await saveDialog({
          defaultPath: `${draft.name || "未命名"}-剧本.md`,
          filters: [{ name: "Markdown", extensions: ["md"] }],
          title: "导出 Markdown 剧本",
        });
        if (!output) return;
        await ipc.saveTextFile(output, md);
        toast.success(`已导出到：${output}`);
      }, "导出失败");
    } finally {
      setExportingMd(false);
    }
  }

  async function handleExportHtml() {
    if (exportingHtml) return;
    setExportingHtml(true);
    try {
      await runWithError(async () => {
        const output = await saveDialog({
          defaultPath: `${draft.name || "未命名"}.html`,
          filters: [{ name: "HTML", extensions: ["html"] }],
          title: "导出 HTML 阅读器",
        });
        if (!output) return;
        await ipc.exportScenarioHtml(scenario.id, output);
        toast.success(`已导出到：${output}`);
      }, "导出失败");
    } finally {
      setExportingHtml(false);
    }
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
      {/* 顶部工具栏 */}
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
            color: "var(--fg-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {draft.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: dirty ? "var(--warning)" : "var(--fg-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {dirty ? "保存中…" : "已保存"}
        </span>

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-primary"
          onClick={() => setPlayOpen(true)}
          style={{ fontSize: 12 }}
          title="全屏试玩"
        >
          ▶ 运行
        </button>
        <button
          className="btn"
          onClick={handleExportMarkdown}
          disabled={exportingMd || exportingHtml}
          style={{ fontSize: 12 }}
          title="导出为可读的 Markdown 剧本"
        >
          {exportingMd ? "导出中…" : "导出 MD"}
        </button>
        <button
          className="btn"
          onClick={handleExportHtml}
          disabled={exportingMd || exportingHtml}
          style={{ fontSize: 12 }}
          title="导出为单文件 HTML 阅读器"
        >
          {exportingHtml ? "导出中…" : "导出 HTML"}
        </button>
      </div>

      {/* 场景 tab 栏 */}
      <div
        style={{
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          gap: 2,
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        {sceneCards.length === 0 && (
          <span
            style={{
              fontSize: 12,
              color: "var(--fg-muted)",
              padding: "6px 8px",
            }}
          >
            还没有场景。去「⚙ 设置」里添加节点。
          </span>
        )}
        {sceneCards.map((c) => {
          const active = c.id === selectedSceneId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedSceneId(c.id)}
              style={{
                padding: "4px 12px",
                border: "none",
                background: active ? "var(--bg-raised)" : "transparent",
                color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
                borderBottom: active
                  ? "2px solid var(--accent-gold)"
                  : "2px solid transparent",
                fontWeight: active ? 600 : 400,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* 内容 */}
      {selectedScene ? (
        <ScriptEditor
          key={selectedScene.id}
          cardId={selectedScene.id}
          cardName={selectedScene.name}
        />
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
          选择或创建一个场景
        </div>
      )}

      {/* 运行覆盖层 */}
      {playOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "var(--bg-app)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "var(--bg-panel)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--fg-muted)",
              }}
            >
              预览 · {draft.name}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn"
              onClick={() => setPlayOpen(false)}
              style={{ fontSize: 12 }}
            >
              关闭（Esc）
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <PlayView scenario={scenario} />
          </div>
        </div>
      )}

    </div>
  );
}
