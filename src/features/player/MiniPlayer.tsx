import { useState } from "react";
import { useSyncExternalStore } from "react";
import {
  getPlayerState,
  subscribePlayer,
  toggle,
  stop,
  seek,
  next,
  prev,
} from "../../lib/audioPlayer";
import { getCollection, collectionColor } from "../../lib/audioCollections";
import { basename } from "../../lib/path";
import { initials } from "../../lib/color";

const PLAY_MODE_LABEL: Record<string, string> = {
  sequential: "顺序",
  loopAll: "列表循环",
  loopOne: "单曲循环",
  shuffle: "随机",
};

export function MiniPlayer() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);
  const [collapsed, setCollapsed] = useState(false);

  // 没有曲目时不渲染
  if (!player.current) return null;

  const hasQueue = player.queue.length > 1;
  const coll = getCollection(player.current);
  const cover = collectionColor(coll);

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
        {/* 集合色块封面占位 */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-sm)",
            background: cover,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
          title={coll ?? "未分组"}
        >
          {initials(player.current)}
        </div>

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
          onClick={() => setCollapsed((c) => !c)}
          style={{ padding: "2px 6px", fontSize: 12, color: "var(--fg-muted)" }}
          title={collapsed ? "展开" : "收起"}
        >
          {collapsed ? "▢" : "—"}
        </button>
        <button
          className="btn btn-ghost"
          onClick={stop}
          style={{
            padding: "2px 6px",
            fontSize: 12,
            color: "var(--fg-muted)",
          }}
          title="关闭"
        >
          ×
        </button>
      </div>

      {!collapsed && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {hasQueue ? (
              <button
                className="btn btn-ghost"
                onClick={prev}
                style={{ padding: "2px 8px", fontSize: 13 }}
                title="上一首"
              >
                ⏮
              </button>
            ) : (
              <span style={{ width: 22 }} />
            )}
            <button
              className="btn btn-ghost"
              onClick={toggle}
              style={{ padding: "2px 8px", fontSize: 13 }}
              title={player.playing ? "暂停" : "播放"}
            >
              {player.playing ? "■" : "▶"}
            </button>
            {hasQueue ? (
              <button
                className="btn btn-ghost"
                onClick={next}
                style={{ padding: "2px 8px", fontSize: 13 }}
                title="下一首"
              >
                ⏭
              </button>
            ) : (
              <span style={{ width: 22 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 10,
                color: "var(--fg-muted)",
                textAlign: "right",
              }}
            >
              {player.queue.length > 0
                ? `${player.queueIndex + 1} / ${player.queue.length} · `
                : ""}
              {PLAY_MODE_LABEL[player.playMode]}
              {player.speed !== 1 ? ` · ${player.speed}×` : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        </>
      )}
    </div>
  );
}
