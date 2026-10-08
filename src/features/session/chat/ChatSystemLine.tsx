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

function systemText(event: GameEvent): string {
  const payload = event.payload as Record<string, unknown>;
  switch (event.kind) {
    case "session.start":
      return "会话开始";
    case "session.end":
      return "会话结束";
    case "token.move":
      return `Token 变动（${payload.count ?? "?"} 个）`;
    case "state.set": {
      const k = payload.key ?? "?";
      const v = payload.value;
      return `状态：${k} = ${JSON.stringify(v)}`;
    }
    case "effect.apply": {
      const applied = payload.applied as
        | Array<{
            raw: string;
            is_roll?: boolean;
            roll_detail?: number[];
          }>
        | undefined;
      const label = payload.relation_label as string | undefined;
      if (!applied || applied.length === 0) {
        return label ? `效果：${label}` : "效果执行";
      }
      const parts = applied.map((a) => {
        const rollInfo =
          a.is_roll && a.roll_detail && a.roll_detail.length > 0
            ? ` [${a.roll_detail.join(",")}]`
            : "";
        return `${a.raw}${rollInfo}`;
      });
      const prefix = label ? `${label} → ` : "";
      return `${prefix}效果：${parts.join(" · ")}`;
    }
    case "note":
      return event.note ?? "备注";
    default:
      return event.kind;
  }
}
