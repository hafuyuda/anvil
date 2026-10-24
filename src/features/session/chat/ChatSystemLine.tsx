import type { GameEvent } from "../../../core/ipc";

export function SystemLine({ event }: { event: GameEvent }) {
  const text = systemText(event);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "10px 0",
        fontSize: 11,
        color: "var(--chat-system-text)",
      }}
    >
      <div
        style={{ flex: 1, height: 1, background: "var(--chat-system-line)" }}
      />
      <span>{text}</span>
      <div
        style={{ flex: 1, height: 1, background: "var(--chat-system-line)" }}
      />
    </div>
  );
}

/**
 * 系统行的文案。
 *
 * 精简后只有一种系统事件：会话起点。棋盘步骤、战斗轮次、会话结束、
 * 状态、备注等分支随棋盘与战斗一并移除 —— 它们本来也没有产生方。
 */
function systemText(event: GameEvent): string {
  switch (event.kind) {
    case "session.start":
      return "会话开始";
    default:
      return event.kind;
  }
}
