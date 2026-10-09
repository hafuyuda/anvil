import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type AudioMeta } from "../../core/ipc";
import { loadAudio, invalidateAudio } from "../../lib/audioCache";
import { toast } from "../../lib/toast";
import { confirmDialog } from "../../lib/confirm";
import { runWithError } from "../../lib/runWithError";

function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AudioTab() {
  const [items, setItems] = useState<AudioMeta[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const list = await ipc.listAudiosWithMeta();
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
    await runWithError(async () => {
      const relative = await ipc.importAudio(src);
      invalidateAudio(relative);
      await refresh();
    }, "导入失败");
  }

  async function handleDelete(item: AudioMeta) {
    const msg =
      item.ref_count > 0
        ? `「${basename(item.path)}」被 ${item.ref_count} 个剧本引用。删除后那些剧本将无法播放。继续？`
        : `删除「${basename(item.path)}」？`;
    if (
      !(await confirmDialog({
        message: msg,
        confirmLabel: "删除",
        danger: true,
      }))
    )
      return;
    await runWithError(async () => {
      await ipc.deleteAudio(item.path);
      invalidateAudio(item.path);
      await refresh();
    }, "删除失败");
  }

  const totalSize = items.reduce((s, i) => s + i.size, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            marginRight: "auto",
          }}
        >
          共 {items.length} 个音频 · {formatSize(totalSize)}
        </span>
        <button className="btn" onClick={handleImport}>
          导入音频
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
          还没有音频。点「导入音频」开始。
        </div>
      )}

      {items.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-surface)",
          }}
        >
          {items.map((item, i) => (
            <AudioRow
              key={item.path}
              item={item}
              isLast={i === items.length - 1}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AudioRow({
  item,
  isLast,
  onDelete,
}: {
  item: AudioMeta;
  isLast: boolean;
  onDelete: () => void;
}) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
        fontSize: 12,
      }}
    >
      <PlayButton path={item.path} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={item.path}
        >
          {basename(item.path)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-muted)",
            marginTop: 2,
            display: "flex",
            gap: 10,
          }}
        >
          <span>{formatSize(item.size)}</span>
          <DurationText path={item.path} />
          <span
            style={{
              color:
                item.ref_count > 0 ? "var(--fg-secondary)" : "var(--warning)",
            }}
          >
            {item.ref_count > 0 ? `${item.ref_count} 处引用` : "未引用"}
          </span>
        </div>
      </div>

      <button
        className="btn btn-ghost"
        onClick={onDelete}
        title="删除"
        style={{
          padding: "2px 10px",
          fontSize: 12,
          color: "var(--danger)",
        }}
      >
        ×
      </button>
    </li>
  );
}

function PlayButton({ path }: { path: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        padding: "4px 10px",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {playing ? "■" : "▶"}
    </button>
  );
}

function DurationText({ path }: { path: string }) {
  const [duration, setDuration] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAudio(path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (!url) return;
    const audio = new Audio();
    audio.preload = "metadata";
    const onLoaded = () => {
      const d = audio.duration;
      if (Number.isFinite(d)) setDuration(d);
    };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.src = url;
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.src = "";
    };
  }, [url]);

  if (duration === null) return null;

  const m = Math.floor(duration / 60);
  const s = Math.floor(duration % 60);
  return (
    <span>
      {m}:{s.toString().padStart(2, "0")}
    </span>
  );
}
