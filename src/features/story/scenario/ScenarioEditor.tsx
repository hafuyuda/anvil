import { useState } from "react";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type Scenario } from "../../../core/ipc";
import { useProjectStore } from "../../../stores/projectStore";
import { useDraft } from "../../../hooks/useDraft";
import { nowMs } from "../../../lib/time";
import { StoryGraphView } from "./StoryGraphView";
import { PlayView } from "../play/PlayView";
import { ScriptPanel } from "../script/ScriptPanel";
import { ScenarioSettingsTab } from "./ScenarioSettingsTab";
import { exportScenarioMarkdown } from "./exportMarkdown";
import { toast } from "../../../lib/toast";

interface Props {
  scenario: Scenario;
}

type Tab = "settings" | "graph" | "script" | "play";

export function ScenarioEditor({ scenario }: Props) {
  const upsertScenario = useProjectStore((s) => s.upsertScenario);
  const cards = useProjectStore((s) => s.cards) ?? [];
  const cardTypes = useProjectStore((s) => s.cardTypes) ?? [];
  const relations = useProjectStore((s) => s.relations) ?? [];

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

  const [tab, setTab] = useState<Tab>("settings");
  const [exportingMd, setExportingMd] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  async function handleExportMarkdown() {
    if (exportingMd) return;
    setExportingMd(true);
    try {
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
    } catch (e) {
      toast.error("导出失败: " + e);
    } finally {
      setExportingMd(false);
    }
  }

  async function handleExportHtml() {
    if (exportingHtml) return;
    setExportingHtml(true);
    try {
      const output = await saveDialog({
        defaultPath: `${draft.name || "未命名"}.html`,
        filters: [{ name: "HTML", extensions: ["html"] }],
        title: "导出 HTML 阅读器",
      });
      if (!output) return;
      await ipc.exportScenarioHtml(scenario.id, output);
      toast.success(`已导出到：${output}`);
    } catch (e) {
      toast.error("导出失败: " + e);
    } finally {
      setExportingHtml(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        background: "var(--bg-app)",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "6px 12px",
          flexShrink: 0,
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        <TabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          设置
        </TabButton>
        <TabButton active={tab === "graph"} onClick={() => setTab("graph")}>
          节点图
        </TabButton>
        <TabButton active={tab === "script"} onClick={() => setTab("script")}>
          剧本
        </TabButton>
        <TabButton active={tab === "play"} onClick={() => setTab("play")}>
          运行
        </TabButton>

        <div style={{ flex: 1 }} />

        <button
          className="btn"
          onClick={handleExportMarkdown}
          disabled={exportingMd || exportingHtml}
          style={{ fontSize: 12 }}
          title="导出为可读的 Markdown 剧本"
        >
          {exportingMd ? "导出中…" : "导出 Markdown"}
        </button>
        <button
          className="btn"
          onClick={handleExportHtml}
          disabled={exportingMd || exportingHtml}
          style={{ fontSize: 12 }}
          title="导出为单文件 HTML 阅读器（图片内嵌）"
        >
          {exportingHtml ? "导出中…" : "导出 HTML"}
        </button>
      </div>

      {tab === "settings" && (
        <ScenarioSettingsTab
          draft={draft}
          update={update}
          dirty={dirty}
          commit={commit}
        />
      )}

      {tab === "graph" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <StoryGraphView scenario={scenario} />
        </div>
      )}

      {tab === "script" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ScriptPanel scenario={scenario} />
        </div>
      )}

      {tab === "play" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <PlayView scenario={scenario} />
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
  );
}
