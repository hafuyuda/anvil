import { useEffect, useState } from "react";
import { ipc, type ProjectStats } from "../../core/ipc";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { getAppSettings } from "../../lib/appSettings";
import { useProjectStore } from "../../stores/projectStore";

export function StatsTab() {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      await runWithError(async () => {
        const s = await ipc.projectStats();
        setStats(s);
      }, "读取统计失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleRebuildIndex() {
    if (
      !(await confirmDialog({
        message: "重建 SQLite 索引？这会扫描所有卡片。",
        confirmLabel: "重建",
      }))
    )
      return;
    setRebuilding(true);
    try {
      const r = await runWithError(() => ipc.rebuildIndex(), "重建失败");
      if (r.ok) {
        toast.success("索引已重建。");
      }
    } finally {
      setRebuilding(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="muted">读取中…</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section title="类型层">
        <Row label="卡牌类型" value={stats.card_types} />
        <Row label="关系类型" value={stats.relation_kinds} />
      </Section>

      <Section title="实例层">
        <Row label="卡牌" value={stats.cards} />
        <Row label="关系" value={stats.relations} />
        <Row label="剧情" value={stats.scenarios} />
        <Row label="棋盘" value={stats.boards} />
      </Section>

      <Section title="运行层">
        <Row label="会话" value={stats.sessions} />
        <Row label="事件" value={stats.events} />
      </Section>

      <Section title="资源">
        <Row label="图片" value={stats.images} />
      </Section>

      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 12,
          display: "flex",
          gap: 8,
        }}
      >
        <button className="btn" onClick={refresh}>
          刷新统计
        </button>
        <button
          className="btn"
          onClick={handleExportDiagnostics}
          style={{ marginLeft: "auto" }}
          title="导出当前状态供问题诊断"
        >
          导出诊断信息
        </button>
        <button
          className="btn"
          onClick={handleRebuildIndex}
          disabled={rebuilding}
        >
          {rebuilding ? "重建中…" : "重建索引"}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "var(--fg-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-surface)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 12,
      }}
    >
      <span style={{ color: "var(--fg-secondary)" }}>{label}</span>
      <span
        style={{
          color: "var(--fg-primary)",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

async function handleExportDiagnostics() {
  const output = await saveDialog({
    defaultPath: `anvil-diagnostics-${Date.now()}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
    title: "导出诊断信息",
  });
  if (!output) return;

  await runWithError(async () => {
    const projectPath = useProjectStore.getState().projectPath;
    const manifest = useProjectStore.getState().manifest;
    const appSettings = getAppSettings();
    const currentStats = await ipc.projectStats();

    const payload = {
      exported_at: new Date().toISOString(),
      project: {
        path: projectPath,
        name: manifest?.name ?? null,
        version: manifest?.version ?? null,
        schema_version: manifest?.schema_version ?? null,
      },
      stats: currentStats,
      app_settings: appSettings,
      system: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
      },
    };

    await ipc.saveTextFile(output, JSON.stringify(payload, null, 2));
    toast.success(`诊断信息已导出到：${output}`);
  }, "导出失败");
}
