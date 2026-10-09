import { useState } from "react";
import { ipc } from "../../../core/ipc";
import { PickerDialog } from "../../../components/PickerDialog";
import type { ScriptFrontmatter } from "./types";
import { AudioSelect } from "../../../components/AudioSelect";
import { toast } from "../../../lib/toast";
import { runWithError } from "../../../lib/runWithError";

interface Props {
  frontmatter: ScriptFrontmatter;
  onChange: (patch: Partial<ScriptFrontmatter>) => void;
}

export function ScriptSceneSettings({ frontmatter, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageOptions, setImageOptions] = useState<
    { value: string; label: string }[]
  >([]);

  async function openBgPicker() {
    await runWithError(async () => {
      const images = await ipc.listImages();
      if (images.length === 0) {
        toast.info("项目里还没有图片。去「项目设置 → 图片资源」导入一张。");
        return;
      }
      setImageOptions(
        images.map((p) => ({
          value: p,
          label: p.replace("assets/images/", ""),
        })),
      );
      setPickerOpen(true);
    }, "读取图片列表失败");
  }

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto 1fr",
        gap: "8px 12px",
        alignItems: "center",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ color: "var(--fg-muted)" }}>背景</span>
      <button
        className="btn"
        onClick={openBgPicker}
        style={{
          textAlign: "left",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={frontmatter.bg ?? ""}
      >
        {frontmatter.bg
          ? frontmatter.bg.replace("assets/images/", "")
          : "— 无背景 —"}
      </button>

      <span style={{ color: "var(--fg-muted)" }}>音乐</span>
      <AudioSelect
        value={frontmatter.bgm ?? null}
        onChange={(v) => onChange({ bgm: v ?? undefined })}
        placeholder="— 无音乐 —"
      />

      <span style={{ color: "var(--fg-muted)" }}>结局</span>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--fg-secondary)",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={frontmatter.is_ending === true}
          onChange={(e) =>
            onChange({ is_ending: e.target.checked || undefined })
          }
          style={{ accentColor: "var(--accent-gold)" }}
        />
        是结局
      </label>

      <span style={{ color: "var(--fg-muted)" }}>结局名</span>
      <input
        className="input"
        value={frontmatter.ending_name ?? ""}
        onChange={(e) => onChange({ ending_name: e.target.value || undefined })}
        placeholder="如：静默新月"
        disabled={frontmatter.is_ending !== true}
        style={{
          opacity: frontmatter.is_ending === true ? 1 : 0.5,
        }}
      />

      {frontmatter.bg && (
        <>
          <span />
          <button
            className="btn btn-ghost"
            onClick={() => onChange({ bg: undefined })}
            style={{ fontSize: 11, padding: "1px 8px", justifySelf: "start" }}
          >
            清除背景
          </button>
        </>
      )}

      {pickerOpen && (
        <PickerDialog
          title="选择背景图"
          options={[{ value: "", label: "— 无背景 —" }, ...imageOptions]}
          onPick={(v) => onChange({ bg: v || undefined })}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
