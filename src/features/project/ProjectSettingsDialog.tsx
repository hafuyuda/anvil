import { useEffect, useState } from "react";
import { ipc, type Manifest } from "../../core/ipc";
import { Modal } from "../../components/Modal";
import { nowMs } from "../../lib/time";

interface Props {
  onClose: () => void;
}

export function ProjectSettingsDialog({ onClose }: Props) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [draft, setDraft] = useState<Manifest | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ipc
      .loadManifest()
      .then((m) => {
        setManifest(m);
        setDraft(m);
      })
      .catch((e) => {
        alert("读取失败: " + e);
        onClose();
      })
      .finally(() => setLoading(false));
  }, [onClose]);

  function update(patch: Partial<Manifest>) {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      alert("项目名不能为空");
      return;
    }
    const next: Manifest = { ...draft, updated_at: nowMs() };
    try {
      await ipc.saveManifest(next);
      setManifest(next);
      setDraft(next);
      setDirty(false);
    } catch (e) {
      alert("保存失败: " + e);
    }
  }

  return (
    <Modal
      title="项目设置"
      width={480}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!dirty}>
            {dirty ? "保存" : "已保存"}
          </button>
        </>
      }
    >
      {loading && (
        <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>读取中…</div>
      )}

      {draft && (
        <>
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
            <span>创建</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {manifest ? new Date(manifest.created_at).toLocaleString() : "—"}
            </span>
            <span>更新</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {manifest ? new Date(manifest.updated_at).toLocaleString() : "—"}
            </span>
          </div>
        </>
      )}
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
