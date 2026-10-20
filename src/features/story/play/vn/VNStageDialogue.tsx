import type { ScriptLine } from "../../script/types";

interface Props {
  line: ScriptLine;
  /** 已显示的文本（由舞台层 useTypewriter 提升而来，保持一致） */
  displayed: string;
  /** 打字机是否已播完 */
  done: boolean;
  /** 立即显示完整文本 */
  skip: () => void;
  onAdvance: () => void;
}

export function VNStageDialogue({ line, displayed, done, skip, onAdvance }: Props) {
  // 防御：指令行不该出现在这里
  if (
    line.type === "bg" ||
    line.type === "bgm" ||
    line.type === "sfx" ||
    line.type === "jump" ||
    line.type === "assign" ||
    line.type === "glue" ||
    line.type === "knot" ||
    line.type === "var" ||
    line.type === "gather" ||
    line.type === "scene_ref" ||
    line.type === "actor_ref" ||
    line.type === "choice"
  ) {
    return null;
  }

  function handleClick() {
    if (!done) {
      skip();
      return;
    }
    onAdvance();
  }

  return (
    <div
      onClick={handleClick}
      style={{
        margin: 16,
        padding: "16px 20px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        minHeight: 120,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {line.type === "say" && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--accent-gold)",
            marginBottom: 6,
            fontFamily: "var(--font-title)",
          }}
        >
          {line.speaker}
        </div>
      )}

      <div
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: "var(--fg-primary)",
          whiteSpace: "pre-wrap",
          fontStyle:
            line.type === "narration" || line.type === "action"
              ? "italic"
              : "normal",
          textAlign: line.type === "narration" ? "center" : "left",
        }}
      >
        {displayed}
        {!done && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              marginLeft: 2,
              animation: "vn-blink 1s step-end infinite",
            }}
          >
            ▌
          </span>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          right: 16,
          bottom: 8,
          fontSize: 11,
          color: "var(--fg-muted)",
        }}
      >
        {done ? "点击继续 ▼" : "点击跳过"}
      </div>
    </div>
  );
}
