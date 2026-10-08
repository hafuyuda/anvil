import { useEffect, useState } from "react";
import { ipc } from "../../../core/ipc";
import { ScriptSourceEditor } from "./ScriptSourceEditor";
import { ScriptStructuredEditor } from "./ScriptStructuredEditor";

interface Props {
  cardId: string;
  cardName: string;
}

type Mode = "structured" | "source";

export function ScriptEditor({ cardId, cardName }: Props) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("structured");

  useEffect(() => {
    setLoaded(false);
    setDirty(false);
    ipc
      .loadScript(cardId)
      .then((c) => {
        setContent(c ?? "");
        setLoaded(true);
      })
      .catch(() => {
        setContent("");
        setLoaded(true);
      });
  }, [cardId]);

  useEffect(() => {
    if (!loaded || !dirty) return;
    const handle = setTimeout(async () => {
      setSaving(true);
      try {
        await ipc.saveScript(cardId, content);
        setDirty(false);
      } catch (e) {
        // 静默；保存失败由 dirty 保留状态，用户下次编辑会重试
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [content, dirty, loaded, cardId]);

  function handleChange(c: string) {
    setContent(c);
    setDirty(true);
  }

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
      {/* 顶部：场景名 + 保存状态 */}
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

      {/* Tab 切换 */}
      <div
        style={{
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          display: "flex",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <TabButton
          active={mode === "structured"}
          onClick={() => setMode("structured")}
        >
          结构
        </TabButton>
        <TabButton active={mode === "source"} onClick={() => setMode("source")}>
          源码
        </TabButton>
      </div>

      {mode === "structured" && (
        <ScriptStructuredEditor content={content} onChange={handleChange} />
      )}
      {mode === "source" && (
        <ScriptSourceEditor content={content} onChange={handleChange} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="btn btn-ghost"
      onClick={onClick}
      style={{
        fontWeight: active ? 600 : 400,
        color: active ? "var(--fg-primary)" : "var(--fg-secondary)",
        borderBottom: active
          ? "2px solid var(--accent-gold)"
          : "2px solid transparent",
        borderRadius: 0,
        padding: "4px 12px",
      }}
    >
      {children}
    </button>
  );
}
