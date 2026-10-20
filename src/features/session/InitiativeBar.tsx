import type { InitiativeEntry, InitiativeTracker, SessionViewMode } from "../../core/ipc";

interface Props {
  tracker: InitiativeTracker | null;
  view: SessionViewMode;
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onEnd: () => void;
}

export function InitiativeBar({
  tracker,
  view,
  onStart,
  onPrev,
  onNext,
  onReset,
  onEnd,
}: Props) {
  const readOnly = view === "player";
  const active = !!tracker?.active && (tracker?.entries.length ?? 0) > 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderBottom: "1px solid var(--initiative-border)",
        background: "var(--initiative-bg)",
        flexShrink: 0,
        minHeight: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--fg-muted)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          先攻
        </span>
        {active && (
          <span
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--fg-secondary)",
            }}
          >
            第 {tracker!.round} 轮
          </span>
        )}
      </div>

      {!active ? (
        <button
          className="btn"
          onClick={onStart}
          disabled={readOnly}
          style={{ fontSize: 12 }}
        >
          开始战斗
        </button>
      ) : (
        <>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              gap: 4,
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            {tracker!.entries.map((e, i) => (
              <Chip
                key={`${e.card_id ?? e.token_id ?? e.name}-${i}`}
                entry={e}
                current={i === clampIndex(tracker!.turn_index, tracker!.entries.length)}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              className="btn"
              onClick={onPrev}
              disabled={readOnly}
              style={{ fontSize: 12, padding: "3px 8px" }}
              title="上一个"
            >
              ←
            </button>
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={readOnly}
              style={{ fontSize: 12, padding: "3px 10px" }}
              title="下一个行动者"
            >
              下一个 →
            </button>
            <button
              className="btn"
              onClick={onReset}
              disabled={readOnly}
              style={{ fontSize: 12, padding: "3px 8px" }}
              title="回到第一轮第一个"
            >
              重置
            </button>
            <button
              className="btn"
              onClick={onEnd}
              disabled={readOnly}
              style={{ fontSize: 12, padding: "3px 8px" }}
              title="结束战斗追踪"
            >
              结束
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ entry, current }: { entry: InitiativeEntry; current: boolean }) {
  const accent = entry.is_pc
    ? "var(--initiative-pc-accent)"
    : "var(--initiative-npc-accent)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        flexShrink: 0,
        background: current ? "var(--initiative-current-bg)" : "var(--bg-surface)",
        border: current
          ? "1px solid var(--initiative-current-bg)"
          : "1px solid var(--border-default)",
        color: current
          ? "var(--initiative-current-text)"
          : "var(--fg-primary)",
      }}
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: current ? "var(--initiative-current-text)" : accent,
          flexShrink: 0,
        }}
        title={entry.is_pc ? "玩家角色" : "非玩家角色"}
      />
      <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>{entry.name}</span>
      <span
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          opacity: 0.8,
        }}
      >
        {entry.value}
      </span>
    </div>
  );
}

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}
