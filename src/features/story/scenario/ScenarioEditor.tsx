import { useEffect, useState } from "react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Card, type Scenario } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { ScriptEditor } from "../script/ScriptEditor";
import { PlayView } from "../play/PlayView";
import { exportScenarioMarkdown } from "./exportMarkdown";
import { toast } from "../../../lib/toast";
import { runWithError } from "../../../lib/runWithError";

interface Props {
  scenario: Scenario;
}

export function ScenarioEditor({ scenario }: Props) {
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];
  const setCurrentScenario = useProjectStore((s) => s.setCurrentScenario);
  const currentSceneId = useProjectStore((s) => s.currentSceneId);
  const setCurrentScene = useProjectStore((s) => s.setCurrentScene);

  const [playOpen, setPlayOpen] = useState(false);
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  const sceneCards: Card[] = scenario.node_ids
    .map((id) => cards.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  const selectedScene = currentSceneId
    ? (cards.find((c) => c.id === currentSceneId) ?? null)
    : null;

  // 当前场景合法性：不在本剧情的节点列表里则重置到 entry / 第一个节点
  useEffect(() => {
    const valid = currentSceneId && scenario.node_ids.includes(currentSceneId);
    if (valid) return;
    setCurrentScene(scenario.entry_node ?? scenario.node_ids[0] ?? null);
  }, [scenario.node_ids, scenario.entry_node, currentSceneId, setCurrentScene]);

  // 通知 store 当前剧情；卸载时同时清理场景
  useEffect(() => {
    setCurrentScenario(scenario.id);
    return () => {
      setCurrentScenario(null);
      setCurrentScene(null);
    };
  }, [scenario.id, setCurrentScenario, setCurrentScene]);

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
          scenario,
          cards,
          cardTypes,
          relations,
        });
        const output = await saveDialog({
          defaultPath: `${scenario.name || "未命名"}-剧本.md`,
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
          defaultPath: `${scenario.name || "未命名"}.html`,
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
          {scenario.name}
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
          const active = c.id === currentSceneId;
          return (
            <button
              key={c.id}
              onClick={() => setCurrentScene(c.id)}
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
              预览 · {scenario.name}
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
