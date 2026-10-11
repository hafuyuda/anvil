import { useEffect, useState, useSyncExternalStore } from "react";
import { ipc } from "../../core/ipc";
import {
  getPlayerState,
  subscribePlayer,
  playTrack,
  toggle,
  stop,
  seek,
  setVolume,
  setLoop,
} from "../../lib/audioPlayer";
import { useUIStore } from "../../stores/uiStore";

function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerPage() {
  const close = useUIStore((s) => s.closePlayer);
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);

  const [tracks, setTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ipc
      .listAudios()
      .then((list) => setTracks(list))
      .catch(() => setTracks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "var(--bg-app)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶栏 */}
      <div
        style={{
          height: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-ghost"
          onClick={close}
          style={{ fontSize: 13 }}
        >
          ← 返回
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
            color: "var(--fg-primary)",
            letterSpacing: 0.5,
          }}
        >
          音频播放器
        </span>
        <span style={{ fontSize: 10, color: "var(--fg-muted)", marginLeft: 4 }}>
          Esc 关闭
        </span>
      </div>

      {/* 主体 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* 左：曲目列表 */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "24px 32px",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--fg-muted)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              曲目（{tracks.length}）
            </div>

            {loading && (
              <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                加载中…
              </div>
            )}

            {!loading && tracks.length === 0 && (
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
                还没有音频。去「项目设置 → 资源」导入。
              </div>
            )}

            {tracks.length > 0 && (
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
                {tracks.map((p, i) => {
                  const active = player.current === p;
                  return (
                    <li
                      key={p}
                      onClick={() => void playTrack(p)}
                      style={{
                        padding: "10px 14px",
                        borderBottom:
                          i < tracks.length - 1
                            ? "1px solid var(--border-subtle)"
                            : "none",
                        cursor: "pointer",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        color: active
                          ? "var(--accent-gold)"
                          : "var(--fg-primary)",
                        background: active ? "var(--bg-raised)" : "transparent",
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          color: "var(--accent-gold)",
                          flexShrink: 0,
                        }}
                      >
                        {active ? (player.playing ? "▶" : "■") : ""}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {basename(p)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 右：当前播放控制 */}
        <div
          style={{
            width: 320,
            borderLeft: "1px solid var(--border-subtle)",
            background: "var(--bg-panel)",
            padding: 16,
            overflowY: "auto",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            正在播放
          </div>

          {player.current ? (
            <>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  color: "var(--fg-primary)",
                  wordBreak: "break-all",
                }}
              >
                {basename(player.current)}
              </div>

              {/* 进度 */}
              <div>
                <input
                  type="range"
                  min={0}
                  max={player.duration || 0}
                  step={0.1}
                  value={player.position}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!player.ready}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                  }}
                >
                  <span>{formatTime(player.position)}</span>
                  <span>{formatTime(player.duration)}</span>
                </div>
              </div>

              {/* 控制 */}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-primary"
                  onClick={toggle}
                  style={{ flex: 1 }}
                >
                  {player.playing ? "暂停" : "播放"}
                </button>
                <button className="btn" onClick={stop}>
                  停止
                </button>
              </div>

              {/* 音量 */}
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
                  音量
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    fontFamily: "var(--font-mono)",
                    textAlign: "right",
                  }}
                >
                  {Math.round(player.volume * 100)}%
                </div>
              </div>

              {/* 循环 */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={player.loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  style={{ accentColor: "var(--accent-gold)" }}
                />
                循环播放
              </label>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              未选择曲目
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
