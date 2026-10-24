import type { GameEvent } from "../../core/ipc";

interface Props {
  events: GameEvent[];
  onDelete: (seq: number) => void;
  onClose: () => void;
}

/**
 * 事件的可读摘要。
 * 写入时就带着 summary（那时卡牌名字还查得到），没有的话退回 kind 兜底。
 */
function describe(ev: GameEvent): string {
  const p = ev.payload as { summary?: unknown } | null;
  if (p && typeof p.summary === "string" && p.summary) return p.summary;
  switch (ev.kind) {
    case "board.place":
      return "落子";
    case "board.move":
      return "移动 Token";
    case "board.flip":
      return "翻转";
    case "board.layer":
      return "调整层序";
    case "board.delete":
      return "删除 Token";
    case "board.pile":
      return "卡盒动作";
    default:
      return ev.kind;
  }
}

function timeOf(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 落子历史（牌谱）。
 *
 * 只是一条只读流水：谁在哪一步被移动 / 翻开 / 抽走。
 * 它不参与撤销 —— 撤销回滚棋盘状态，牌谱里那一条仍是「当初确实这么走过」。
 * 单条可删，用来擦掉误记，不动棋盘。
 */
export function BoardHistoryPanel({ events, onDelete, onClose }: Props) {
  const shown = [...events].reverse();

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
          }}
        >
          落子历史
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
          {events.length} 条
        </span>
        <button
          className="btn btn-icon spacer"
          onClick={onClose}
          title="收起"
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {shown.length === 0 ? (
          <div
            style={{
              padding: 12,
              fontSize: 12,
              color: "var(--fg-muted)",
              lineHeight: 1.6,
            }}
          >
            还没有记录。移动、翻转、抽牌都会在这儿留一条。
          </div>
        ) : (
          shown.map((ev) => (
            <div
              key={ev.seq}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                padding: "5px 8px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  color: "var(--fg-muted)",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {timeOf(ev.at)}
              </span>
              <span style={{ flex: 1, wordBreak: "break-word" }}>
                {describe(ev)}
              </span>
              <button
                className="btn btn-icon"
                onClick={() => onDelete(ev.seq)}
                title="删除这条记录（不影响棋盘）"
                style={{ flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
