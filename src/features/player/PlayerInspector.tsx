import { useSyncExternalStore } from "react";
import {
  getPlayerState,
  subscribePlayer,
  toggle,
  stop,
  seek,
  setVolume,
  setPlayMode,
  setSpeed,
  setCrossfadeMs,
  next,
  prev,
  type PlayMode,
} from "../../lib/audioPlayer";
import { basename } from "../../lib/path";
import { formatDuration } from "../../lib/format";
import { cx } from "../../lib/cx";

const PLAY_MODES: { value: PlayMode; label: string }[] = [
  { value: "sequential", label: "顺序" },
  { value: "loopAll", label: "列表循环" },
  { value: "loopOne", label: "单曲" },
  { value: "shuffle", label: "随机" },
];

export function PlayerInspector() {
  const player = useSyncExternalStore(subscribePlayer, getPlayerState);

  if (!player.current) {
    return (
      <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
        从左侧选一首曲目开始播放
      </div>
    );
  }

  const hasQueue = player.queue.length > 1;

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
          {player.queue.length > 0
            ? ` · ${player.queueIndex + 1} / ${player.queue.length}`
            : ""}
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
          <span>{formatDuration(player.position)}</span>
          <span>{formatDuration(player.duration)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn btn-ghost"
          onClick={prev}
          disabled={!hasQueue}
          style={{ flex: 1, opacity: hasQueue ? 1 : 0.4 }}
          title="上一首"
        >
          ⏮
        </button>
        <button
          className="btn btn-primary"
          onClick={toggle}
          style={{ flex: 2 }}
        >
          {player.playing ? "暂停" : "播放"}
        </button>
        <button className="btn" onClick={stop} style={{ flex: 1 }}>
          停止
        </button>
        <button
          className="btn btn-ghost"
          onClick={next}
          disabled={!hasQueue}
          style={{ flex: 1, opacity: hasQueue ? 1 : 0.4 }}
          title="下一首"
        >
          ⏭
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
          播放模式
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {PLAY_MODES.map((m) => {
            const active = player.playMode === m.value;
            return (
          <button
            key={m.value}
            className={cx("btn", active && "btn-primary")}
            onClick={() => setPlayMode(m.value)}
            style={{ flex: 1, fontSize: 11, padding: "4px 0" }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
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
      倍速
    </div>
    <div style={{ display: "flex", gap: 4 }}>
      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => {
        const active = Math.abs(player.speed - s) < 1e-6;
        return (
          <button
            key={s}
            className={cx("btn", active && "btn-primary")}
            onClick={() => setSpeed(s)}
            style={{ flex: 1, fontSize: 11, padding: "4px 0" }}
          >
            {s}×
          </button>
        );
      })}
    </div>
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
      跨曲淡入淡出
    </div>
    <select
      className="input"
      value={String(player.crossfadeMs)}
      onChange={(e) => setCrossfadeMs(Number(e.target.value))}
      style={{ width: "100%", fontSize: 12 }}
    >
      <option value="0">关闭</option>
      <option value="150">150 ms</option>
      <option value="300">300 ms</option>
      <option value="500">500 ms</option>
      <option value="800">800 ms</option>
    </select>
    <div
      style={{
        fontSize: 10,
        color: "var(--fg-muted)",
        marginTop: 2,
      }}
    >
      切换曲目时对叠淡入淡出，适合演出衔接
    </div>
  </div>
</div>
  );
}
