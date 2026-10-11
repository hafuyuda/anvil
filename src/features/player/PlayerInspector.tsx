import { useSyncExternalStore } from "react";
import {
  getPlayerState,
  subscribePlayer,
  toggle,
  stop,
  seek,
  setVolume,
  setLoop,
} from "../../lib/audioPlayer";

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

export function PlayerInspector() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);

  if (!player.current) {
    return (
      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
        从左侧选一首曲目开始播放
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          正在播放
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--fg-primary)",
            wordBreak: "break-all",
          }}
        >
          {basename(player.current)}
        </div>
      </div>

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
    </div>
  );
}
