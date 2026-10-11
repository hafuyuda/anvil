import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { ipc, type AudioMeta } from "../../core/ipc";
import {
  getPlayerState,
  subscribePlayer,
  playTrack,
  stop,
} from "../../lib/audioPlayer";
import { invalidateAsset, loadAsset } from "../../lib/assetCache";
import { runWithError } from "../../lib/runWithError";
import { confirmDialog } from "../../lib/confirm";
import { useSyncExternalStore } from "react";

function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerView() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);
  const [items, setItems] = useState<AudioMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((it) => basename(it.path).toLowerCase().includes(q))
    : items;

  async function handleImport() {
    const src = await openDialog({
      multiple: false,
      filters: [{ name: "音频", extensions: ["mp3", "ogg", "wav", "m4a"] }],
      title: "导入音频",
    });
    if (!src || Array.isArray(src)) return;

    const r = await runWithError(async () => {
      const relative = await ipc.importAudio(src);
      invalidateAsset(relative);
      await refresh();
      return relative;
    }, "导入失败");
    if (!r.ok) return;

    if (!getPlayerState().playing) {
      void playTrack(r.value);
    }
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
      if (player.current === item.path) stop();
      await ipc.deleteAudio(item.path);
      invalidateAsset(item.path);
      await refresh();
    }, "删除失败");
  }

  const totalSize = items.reduce((s, i) => s + i.size, 0);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-app)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            marginRight: "auto",
          }}
        >
          {query
            ? `显示 ${filtered.length} / ${items.length} 个音频`
            : `共 ${items.length} 个音频 · ${formatSize(totalSize)}`}
        </span>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索文件名…"
          style={{ width: 180, fontSize: 12 }}
        />
        <button className="btn" onClick={handleImport} style={{ fontSize: 12 }}>
          + 导入音频
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12 }}>
        {loading && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>加载中…</div>
        )}

        {!loading && items.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
            }}
          >
            还没有音频。点右上角「+ 导入音频」开始。
          </div>
        )}

        {!loading && items.length > 0 && filtered.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--fg-muted)",
              fontSize: 12,
            }}
          >
            无匹配
          </div>
        )}

        {filtered.length > 0 && (
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
            {filtered.map((item, i) => {
              const isCurrent = player.current === item.path;
              const isPlaying = isCurrent && player.playing;
              return (
                <li
                  key={item.path}
                  onClick={() => void playTrack(item.path)}
                  style={{
                    padding: "8px 14px",
                    borderBottom:
                      i < filtered.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                    cursor: "pointer",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: isCurrent
                      ? "var(--accent-gold)"
                      : "var(--fg-primary)",
                    background: isCurrent ? "var(--bg-raised)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      color: "var(--accent-gold)",
                      flexShrink: 0,
                    }}
                  >
                    {isCurrent ? (isPlaying ? "▶" : "■") : ""}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-mono)",
                    }}
                    title={item.path}
                  >
                    {basename(item.path)}
                  </span>
                  <DurationCell path={item.path} />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--fg-muted)",
                      fontFamily: "var(--font-mono)",
                      flexShrink: 0,
                      width: 64,
                      textAlign: "right",
                    }}
                  >
                    {formatSize(item.size)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color:
                        item.ref_count > 0
                          ? "var(--fg-muted)"
                          : "var(--warning)",
                      flexShrink: 0,
                      width: 72,
                      textAlign: "right",
                    }}
                  >
                    {item.ref_count > 0 ? `${item.ref_count} 处引用` : "未引用"}
                  </span>
                  <button
                    className="btn btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(item);
                    }}
                    title="删除"
                    style={{
                      padding: "2px 8px",
                      fontSize: 12,
                      color: "var(--danger)",
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function DurationCell({ path }: { path: string }) {
  const [duration, setDuration] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAsset(path).then((u) => {
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

  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--fg-muted)",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
        width: 40,
        textAlign: "right",
      }}
    >
      {duration === null ? "—" : formatTime(duration)}
    </span>
  );
}
