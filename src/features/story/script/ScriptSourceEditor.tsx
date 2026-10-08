import { useMemo } from "react";
import { parseScript } from "./parser";
import { ScriptPreview } from "./ScriptPreview";

interface Props {
  content: string;
  onChange: (c: string) => void;
}

export function ScriptSourceEditor({ content, onChange }: Props) {
  const parsed = useMemo(() => parseScript(content), [content]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "4px 12px",
          fontSize: 11,
          color: "var(--fg-muted)",
          background: "var(--bg-app)",
          borderBottom: "1px solid var(--border-subtle)",
          fontFamily: "var(--font-mono)",
          flexShrink: 0,
          lineHeight: 1.6,
        }}
      >
        {"> 旁白"} · {"**角色**（表情）：对白"} · {"*动作*"} · {"@bg 路径"} ·{" "}
        {"@bgm 文件"}
        <div style={{ color: "var(--fg-muted)", fontSize: 10 }}>
          顶部 frontmatter 可写：
          <span style={{ color: "var(--fg-secondary)" }}>
            {" "}
            bg · bgm · is_ending · ending_name
          </span>
        </div>
        <div style={{ color: "var(--fg-muted)", fontSize: 10 }}>
          说话人按名字匹配项目中的卡。立绘从卡的{" "}
          <span style={{ color: "var(--fg-secondary)" }}>
            portrait_&lt;表情&gt;
          </span>{" "}
          image 字段读取。
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`> 炉火噼啪作响。\n\n**布洛克**（neutral）：坐吧，旅人。\n\n*格蕾塔从炉边跑过来。*`}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 12,
            border: "none",
            outline: "none",
            resize: "none",
            background: "var(--bg-app)",
            color: "var(--fg-primary)",
            fontSize: 13,
            lineHeight: 1.7,
            fontFamily: "var(--font-mono)",
            boxSizing: "border-box",
          }}
        />

        <div
          style={{
            width: 320,
            borderLeft: "1px solid var(--border-subtle)",
            overflowY: "auto",
            background: "var(--bg-panel)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 10,
              color: "var(--fg-muted)",
              textTransform: "uppercase",
              letterSpacing: 1,
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            解析预览（{parsed.lines.length} 行）
          </div>
          <ScriptPreview script={parsed} />
        </div>
      </div>
    </div>
  );
}
