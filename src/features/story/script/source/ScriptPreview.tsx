import type { ParsedScript } from "../types";

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
    case "knot":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-gold)" }}>
          <span style={labelStyle}>knot</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--fg-primary)",
            }}
          >
            === {line.name}
          </span>
        </div>
      );
    case "var":
      return (
        <div style={rowStyle}>
          <span style={labelStyle}>变量</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-secondary)",
            }}
          >
            {line.key} = {line.literal}
          </span>
        </div>
      );
    case "narration":
      // 草稿（未识别语法）：标成「草稿」而非误导性的「旁白」，
      // 与结构化编辑器一致（空行只是空输入、不会变旁白）。
      if (line.draft) {
        return (
          <div style={{ ...rowStyle, borderLeftColor: "var(--warning)" }}>
            <span style={labelStyle}>草稿</span>
            <span style={{ color: "var(--fg-muted)" }}>{line.text}</span>
          </div>
        );
      }
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
    case "scene_ref":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>场景卡</span>
          <span style={{ color: "var(--fg-primary)" }}>@scene {line.cardName}</span>
        </div>
      );
    case "actor_ref":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>角色</span>
          <span style={{ color: "var(--fg-primary)" }}>@actor {line.cardName}</span>
        </div>
      );
    case "jump":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-gold)" }}>
          <span style={labelStyle}>跳转</span>
          <span style={{ color: "var(--fg-primary)" }}>→ {line.target}</span>
        </div>
      );
    case "choice":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-gold)" }}>
          <span style={labelStyle}>选项</span>
          <span style={{ color: "var(--fg-primary)" }}>· {line.label}</span>
        </div>
      );
    case "gather":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-steel)" }}>
          <span style={labelStyle}>汇合</span>
          {line.text ? (
            <span className="secondary">{line.text}</span>
          ) : (
            <span style={{ color: "var(--fg-muted)" }}>选项在此汇合</span>
          )}
        </div>
      );
    case "condition":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--warning)" }}>
          <span style={labelStyle}>条件</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-secondary)",
            }}
          >
            {line.expr}
          </span>
          {line.text && (
            <span style={{ color: "var(--fg-muted)" }}>：{line.text}</span>
          )}
        </div>
      );
    case "assign":
      return (
        <div style={{ ...rowStyle, borderLeftColor: "var(--accent-flame)" }}>
          <span style={labelStyle}>赋值</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-secondary)",
            }}
          >
            {line.key} {line.op} {line.value}
          </span>
        </div>
      );
    case "glue":
      return (
        <div style={rowStyle}>
          <span style={labelStyle}>粘合</span>
          <span style={{ color: "var(--fg-muted)" }}>⧉ 与上一行拼接</span>
        </div>
      );
  }
}
