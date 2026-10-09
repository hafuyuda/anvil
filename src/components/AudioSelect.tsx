import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc } from "../core/ipc";
import { Modal } from "./Modal";
import { invalidateAudio } from "../lib/audioCache";
import { useRef } from "react";
import { loadAudio } from "../lib/audioCache";
import { toast } from "../lib/toast";

interface Props {
  value: string | null | undefined;
  onChange: (relative: string | null) => void;
  placeholder?: string;
  /** 是否在右侧显示试听按钮，默认 true */
  allowPreview?: boolean;
}

/**
 * 音频选择器。
 * 点击 → 弹选择对话框（列出项目内音频 + 导入按钮）。
 */
export function AudioSelect({
  value,
  onChange,
  placeholder = "— 无音频 —",
  allowPreview = true,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const displayName = value ? value.replace("assets/audio/", "") : null;

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        alignItems: "center",
        minWidth: 0,
      }}
    >
      <button
        className="btn"
        onClick={() => setPickerOpen(true)}
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value ?? ""}
      >
        {displayName ?? placeholder}
      </button>
      {allowPreview && value && <AudioPreviewButton path={value} />}
      {value && (
        <button
          className="btn btn-ghost"
          onClick={() => onChange(null)}
          title="清除"
          style={{
            padding: "2px 8px",
            fontSize: 12,
            color: "var(--danger)",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}

      {pickerOpen && (
        <AudioPickerDialog
          onPick={(v) => {
            onChange(v);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function AudioPreviewButton({ path }: { path: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 路径变化时停止
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  }, [path]);

  // 卸载时停止
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function toggle() {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    const url = await loadAudio(path);
    if (!url) return;
    const audio = new Audio(url);
    audio.volume = 0.7;
    audio.onended = () => {
      setPlaying(false);
      audioRef.current = null;
    };
    void audio.play().catch(() => {
      setPlaying(false);
    });
    audioRef.current = audio;
    setPlaying(true);
  }

  return (
    <button
      className="btn btn-ghost"
      onClick={() => void toggle()}
      title={playing ? "停止" : "试听"}
      style={{
        padding: "2px 8px",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {playing ? "■" : "▶"}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// 选择对话框
// ────────────────────────────────────────────────────────────

function AudioPickerDialog({
  onPick,
  onClose,
}: {
  onPick: (relative: string | null) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const list = await ipc.listAudios();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleImport() {
    const src = await openDialog({
      multiple: false,
      filters: [{ name: "音频", extensions: ["mp3", "ogg", "wav", "m4a"] }],
      title: "导入音频",
    });
    if (!src || Array.isArray(src)) return;
    try {
      const relative = await ipc.importAudio(src);
      invalidateAudio(relative);
      await refresh();
      onPick(relative);
    } catch (e) {
      toast.error("导入失败: " + e);
    }
  }

  return (
    <Modal
      title="选择音频"
      width={460}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => onPick(null)}>
            清除
          </button>
          <button className="btn" onClick={onClose}>
            取消
          </button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
          共 {items.length} 个文件
        </span>
        <button className="btn" onClick={handleImport} style={{ fontSize: 12 }}>
          + 导入音频
        </button>
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>加载中…</div>
      )}

      {!loading && items.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--fg-muted)",
            fontSize: 12,
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          还没有音频。点「+ 导入音频」开始。
        </div>
      )}

      {!loading && items.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {items.map((p, i) => {
            const name = p.replace("assets/audio/", "");
            return (
              <li
                key={p}
                onClick={() => onPick(p)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom:
                    i < items.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--bg-raised)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--fg-primary)",
                  }}
                  title={p}
                >
                  {name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
