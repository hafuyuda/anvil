import { useEffect, useRef, useState } from "react";
import { ipc, type Manifest } from "../../core/ipc";
import { Modal } from "../../components/Modal";
import { nowMs } from "../../lib/time";
import { ThemePanel } from "./ThemePanel";
import { AssetsTab } from "./AssetsTab";
import { StatsTab } from "./StatsTab";
import { ImageField } from "../../components/ImageField";
import { AudioTab } from "./AudioTab";
import { toast } from "../../lib/toast";
import { runWithError } from "../../lib/runWithError";

interface Props {
  onClose: () => void;
}

export function ProjectSettingsDialog({ onClose }: Props) {
  const [tab, setTab] = useState<
    "general" | "theme" | "assets" | "audio" | "stats"
  >("general");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [draft, setDraft] = useState<Manifest | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  // onClose 用 ref 稳定引用，避免父组件重渲染时 effect 重跑
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    ipc
      .loadManifest()
      .then((m) => {
        setManifest(m);
        setDraft(m);
      })
      .catch((e) => {
        toast.error("读取失败: " + e);
        onCloseRef.current();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<Manifest>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.info("项目名不能为空");
      return;
    }
    const next: Manifest = { ...draft, updated_at: nowMs() };
    await runWithError(async () => {
      await ipc.saveManifest(next);
      setManifest(next);
      setDraft(next);
      setDirty(false);
    }, "保存失败");
  }

  async function saveThemeId(id: string | null) {
    if (!draft) return;
    const next: Manifest = {
      ...draft,
      theme_id: id,
      updated_at: nowMs(),
    };
    setDraft(next);
    await runWithError(async () => {
      await ipc.saveManifest(next);
      setManifest(next);
    }, "保存失败");
  }

  return (
    <Modal
      title="项目设置"
      width={
        tab === "theme" ? 700 : tab === "assets" || tab === "audio" ? 720 : 480
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
          {tab === "general" && (
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={!dirty}
            >
              {dirty ? "保存" : "已保存"}
            </button>
          )}
        </>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: 6,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={() => setTab("general")}
          style={{
            fontWeight: tab === "general" ? 600 : 400,
            borderBottom:
              tab === "general"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          常规
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setTab("theme")}
          style={{
            fontWeight: tab === "theme" ? 600 : 400,
            borderBottom:
              tab === "theme"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          主题
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setTab("assets")}
          style={{
            fontWeight: tab === "assets" ? 600 : 400,
            borderBottom:
              tab === "theme"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          图片资源
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setTab("audio")}
          style={{
            fontWeight: tab === "audio" ? 600 : 400,
            borderBottom:
              tab === "audio"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          音频资源
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setTab("stats")}
          style={{
            fontWeight: tab === "stats" ? 600 : 400,
            borderBottom:
              tab === "theme"
                ? "2px solid var(--accent-gold)"
                : "2px solid transparent",
            borderRadius: 0,
          }}
        >
          数据统计
        </button>
      </div>

      {loading && (
        <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>读取中…</div>
      )}

      {tab === "general" && draft && (
        <>
          {/* 原来的常规内容 */}
          <LabeledBlock label="项目名">
            <input
              className="input"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              style={{
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-title)",
              }}
            />
          </LabeledBlock>

          <LabeledBlock label="版本">
            <input
              className="input"
              value={draft.version}
              onChange={(e) => update({ version: e.target.value })}
              placeholder="0.1.0"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </LabeledBlock>

          <LabeledBlock label="作者">
            <input
              className="input"
              value={draft.author ?? ""}
              onChange={(e) => update({ author: e.target.value || null })}
            />
          </LabeledBlock>

          <LabeledBlock label="描述">
            <textarea
              className="textarea"
              value={draft.description ?? ""}
              onChange={(e) => update({ description: e.target.value || null })}
              style={{ minHeight: 60 }}
            />
          </LabeledBlock>

          <LabeledBlock label="默认卡背（未单独指定卡背的类型会用它）">
            <ImageField
              value={draft.default_card_back ?? null}
              onChange={(v) => update({ default_card_back: v })}
            />
          </LabeledBlock>

          <div
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 10,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "4px 12px",
              fontSize: 11,
              color: "var(--fg-muted)",
            }}
          >
            <span>格式</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {manifest?.kind}
            </span>
            <span>Schema</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {manifest?.schema_version}
            </span>
          </div>
        </>
      )}

      {tab === "theme" && draft && (
        <ThemePanel
          manifestThemeId={draft.theme_id ?? null}
          onChangeThemeId={saveThemeId}
        />
      )}

      {tab === "assets" && <AssetsTab />}
      {tab === "audio" && <AudioTab />}
      {tab === "stats" && <StatsTab />}
    </Modal>
  );
}

function LabeledBlock({
  label,
  children,
}: {
  label: string;
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
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
