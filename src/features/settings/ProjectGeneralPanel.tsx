import { useEffect, useState } from "react";
import { ipc, type Manifest } from "../../core/ipc";
import { useProjectStore } from "../../stores/projectStore";
import { nowMs } from "../../lib/time";
import { SectionLabel } from "../../components/ui/SectionLabel";
import { toast } from "../../lib/toast";
import { runWithError } from "../../lib/runWithError";
import { isCardStyleId, listCardStyles } from "../../components/card/CardFrame";
import {
  hasCardBackStyle,
  listCardBackStyles,
} from "../../components/card/CardFrame/primitives/back-styles/registry";

export function ProjectGeneralPanel() {
  const manifest = useProjectStore((s) => s.manifest);
  const setManifest = useProjectStore((s) => s.setManifest);

  const [draft, setDraft] = useState<Manifest | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (manifest) {
      setDraft(manifest);
      setDirty(false);
    }
  }, [manifest]);

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

  if (!draft) {
    return (
      <div style={{ color: "var(--fg-muted)", fontSize: 12 }}>读取中…</div>
    );
  }

  // 默认卡背：已注册风格 id 走下拉；图片路径（旧数据）显示原始值
  const backIsImage =
    draft.default_card_back != null &&
    !hasCardBackStyle(draft.default_card_back);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="项目名">
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
      </Field>

      <Field label="版本">
        <input
          className="input"
          value={draft.version}
          onChange={(e) => update({ version: e.target.value })}
          placeholder="0.1.0"
          style={{ fontFamily: "var(--font-mono)" }}
        />
      </Field>

      <Field label="作者">
        <input
          className="input"
          value={draft.author ?? ""}
          onChange={(e) => update({ author: e.target.value || null })}
        />
      </Field>

      <Field label="描述">
        <textarea
          className="textarea"
          value={draft.description ?? ""}
          onChange={(e) => update({ description: e.target.value || null })}
          style={{ minHeight: 60 }}
        />
      </Field>

      <Field label="默认卡背（未单独指定卡背的类型会用它）">
        {backIsImage && (
          <div
            style={{
              fontSize: 11,
              color: "var(--accent-gold)",
              marginBottom: 4,
              padding: "4px 6px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            旧数据图片：{draft.default_card_back}
            <button
              className="btn"
              style={{ fontSize: 10, marginLeft: 6 }}
              onClick={() => update({ default_card_back: null })}
            >
              清除
            </button>
          </div>
        )}
        <select
          className="select"
          value={backIsImage ? "" : (draft.default_card_back ?? "")}
          onChange={(e) =>
            update({ default_card_back: e.target.value || null })
          }
        >
          <option value="">— 内置铁砧 —</option>
          {listCardBackStyles().map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="默认卡框风格（新建类型时使用，留空继承应用设置）">
        <select
          className="select"
          value={
            isCardStyleId(draft.default_card_frame_style)
              ? draft.default_card_frame_style
              : ""
          }
          onChange={(e) =>
            update({ default_card_frame_style: e.target.value || null })
          }
        >
          <option value="">— 继承应用设置 —</option>
          {listCardStyles().map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <div
        style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8 }}
      >
        <button className="btn btn-primary" onClick={save} disabled={!dirty}>
          {dirty ? "保存" : "已保存"}
        </button>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          格式 {manifest?.kind} · Schema {manifest?.schema_version}
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel variant="field">{label}</SectionLabel>
      {children}
    </div>
  );
}
