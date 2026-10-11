import { useSyncExternalStore } from "react";
import {
  getPlayerState,
  subscribePlayer,
  toggle,
  stop,
  seek,
} from "../../lib/audioPlayer";

function basename(p: string): string {
  const parts = p.split("/");
  return parts[parts.length - 1] ?? p;
}

export function MiniPlayer() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);

  // 没有曲目时不渲染
  if (!player.current) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(var(--statusbar-h) + 12px)",
        width: 300,
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        padding: 10,
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={toggle}
          style={{ padding: "2px 8px", fontSize: 13 }}
          title={player.playing ? "暂停" : "播放"}
        >
          {player.playing ? "■" : "▶"}
        </button>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            color: "var(--fg-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
          }}
          title={player.current}
        >
          {basename(player.current)}
        </span>
        <button
          className="btn btn-ghost"
          onClick={stop}
          style={{
            padding: "2px 8px",
            fontSize: 12,
            color: "var(--fg-muted)",
          }}
          title="关闭"
        >
          ×
        </button>
      </div>

      <input
        type="range"
        min={0}
        max={player.duration || 0}
        step={0.1}
        value={player.position}
        onChange={(e) => seek(Number(e.target.value))}
        disabled={!player.ready}
        style={{ width: "100%", height: 4 }}
      />
    </div>
  );
}
