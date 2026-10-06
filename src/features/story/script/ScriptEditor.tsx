import { useEffect, useMemo, useState } from "react";
import { ipc } from "../../../core/ipc";
import { parseScript } from "./parser";
import { ScriptPreview } from "./ScriptPreview";

interface Props {
  cardId: string;
  cardName: string;
}

export function ScriptEditor({ cardId, cardName }: Props) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载
  useEffect(() => {
    setLoaded(false);
    setDirty(false);
    ipc
      .loadScript(cardId)
      .then((c) => {
        setContent(c ?? "");
        setLoaded(true);
      })
      .catch((e) => {
        console.error(e);
        setContent("");
        setLoaded(true);
      });
  }, [cardId]);

  // 自动保存（800ms）
  useEffect(() => {
    if (!loaded || !dirty) return;
    const handle = setTimeout(async () => {
      setSaving(true);
      try {
        await ipc.saveScript(cardId, content);
        setDirty(false);
      } catch (e) {
        console.error("保存剧本失败:", e);
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [content, dirty, loaded, cardId]);

  const parsed = useMemo(() => parseScript(content), [content]);

  if (!loaded) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-muted)",
          fontSize: 12,
        }}
      >
        加载中…
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 顶部 */}
      <div
        style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-title)",
            color: "var(--fg-primary)",
          }}
        >
          {cardName}
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            color: saving
              ? "var(--accent-flame)"
              : dirty
                ? "var(--warning)"
                : "var(--fg-muted)",
          }}
        >
          {saving ? "保存中…" : dirty ? "有未保存修改" : "已保存"}
        </span>
      </div>

      {/* 语法提示 */}
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

      {/* 主体：源码 + 预览 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
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
