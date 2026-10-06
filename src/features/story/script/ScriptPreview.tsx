import type { ParsedScript } from "./types";

interface Props {
  script: ParsedScript;
}

export function ScriptPreview({ script }: Props) {
  const fm = script.frontmatter;
  const hasFm = fm.bg || fm.bgm || fm.is_ending !== undefined || fm.ending_name;

  if (!hasFm && script.lines.length === 0) {
    return (
      <div
        style={{
          padding: 12,
          color: "var(--fg-muted)",
          fontSize: 12,
          textAlign: "center",
        }}
      >
        还没有内容
      </div>
    );
  }

  return (
    <div style={{ padding: 10, fontSize: 12, lineHeight: 1.6 }}>
      {hasFm && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {fm.bg && <div>背景：{fm.bg}</div>}
          {fm.bgm && <div>音乐：{fm.bgm}</div>}
          {fm.is_ending !== undefined && (
            <div>结局：{fm.is_ending ? "是" : "否"}</div>
          )}
          {fm.ending_name && <div>结局名：{fm.ending_name}</div>}
        </div>
      )}

      {script.lines.map((line, i) => (
        <PreviewLine key={i} line={line} />
      ))}
    </div>
  );
}

function PreviewLine({ line }: { line: ParsedScript["lines"][number] }) {
  const labelStyle: React.CSSProperties = {
    display: "inline-block",
    fontSize: 10,
    color: "var(--fg-muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginRight: 6,
    minWidth: 44,
    verticalAlign: "top",
  };

  const rowStyle: React.CSSProperties = {
    marginBottom: 6,
    padding: "4px 6px",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-surface)",
    borderLeft: "2px solid var(--border-subtle)",
  };

  switch (line.type) {
    case "narration":
      return (
        <div style={rowStyle}>
          <span style={labelStyle}>旁白</span>
          <span style={{ color: "var(--fg-secondary)", fontStyle: "italic" }}>
            {line.text}
          </span>
        </div>
      );
    case "say":
      return (
        <div
          style={{
            ...rowStyle,
            borderLeftColor: "var(--accent-gold)",
          }}
        >
          <span style={labelStyle}>对白</span>
          <span style={{ fontWeight: 600, color: "var(--fg-primary)" }}>
            {line.speaker}
          </span>
          {line.portrait && (
            <span style={{ color: "var(--fg-muted)", fontSize: 11 }}>
              （{line.portrait}）
            </span>
          )}
          <span style={{ color: "var(--fg-muted)" }}>：</span>
          <span style={{ color: "var(--fg-primary)" }}>{line.text}</span>
        </div>
      );
    case "action":
      return (
        <div style={rowStyle}>
          <span style={labelStyle}>动作</span>
          <span style={{ color: "var(--fg-secondary)", fontStyle: "italic" }}>
            {line.text}
          </span>
        </div>
      );
    case "bg":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>背景</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {line.image}
          </span>
        </div>
      );
    case "bgm":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>音乐</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {line.file}
          </span>
        </div>
      );
    case "sfx":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>音效</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {line.file}
          </span>
        </div>
      );
  }
}
